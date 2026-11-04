import { BadRequestException, Body, ConflictException, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, Site, Visit } from './schemas';
import { isValidAddress, normalizeAddress } from './common/address';
import { cleanHtml, toText } from './common/sanitize';

const VIA = ['typed', 'link', 'back', 'forward', 'history', 'search'];

function snippet(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  const start = Math.max(0, (at === -1 ? 0 : at) - 40);
  const out = text.slice(start, start + 160).trim();
  return (start > 0 ? '…' : '') + out + (start + 160 < text.length ? '…' : '');
}

@Controller()
export class WebController {
  constructor(
    @InjectModel(Person.name) private people: Model<Person>,
    @InjectModel(Site.name) private sites: Model<Site>,
    @InjectModel(Visit.name) private visits: Model<Visit>,
  ) {}

  @Get('people')
  async listPeople() {
    const rows = await this.people.find().sort({ name: 1 }).lean();
    return rows.map((p) => p.name);
  }

  @Get('pages')
  async page(@Query('address') raw: string) {
    const address = normalizeAddress(raw);
    if (!address) throw new BadRequestException('address required');
    const site = await this.sites.findOne({ address }).lean();
    if (!site) return { found: false, address };
    return { found: true, address, title: site.title, author: site.author, html: site.html };
  }

  @Post('visits')
  async visit(@Body() body: { person?: string; address?: string; via?: string }) {
    const address = normalizeAddress(body.address ?? '');
    if (!body.person || !address || !VIA.includes(body.via ?? '')) {
      throw new BadRequestException('person, address and valid via required');
    }
    if (!(await this.people.exists({ name: body.person }))) throw new BadRequestException('unknown person');
    const found = !!(await this.sites.exists({ address }));
    const doc = await this.visits.create({ person: body.person, address, via: body.via, found, at: new Date() });
    return { id: doc._id, address, found, at: doc.at };
  }

  @Get('history')
  async history(@Query('person') person: string, @Query('limit') rawLimit?: string) {
    if (!person) throw new BadRequestException('person required');
    const limit = Math.min(Math.max(parseInt(rawLimit ?? '200', 10) || 200, 1), 500);
    const rows = await this.visits.find({ person }).sort({ at: -1 }).limit(limit).lean();
    const addresses = [...new Set(rows.map((v) => v.address))];
    const sites = await this.sites.find({ address: { $in: addresses } }, { address: 1, title: 1 }).lean();
    const titles = new Map(sites.map((s) => [s.address, s.title]));
    return rows.map((v) => ({
      id: v._id,
      address: v.address,
      title: titles.get(v.address) ?? null,
      via: v.via,
      found: v.found,
      at: v.at,
    }));
  }

  @Get('search')
  async search(@Query('q') q: string) {
    const query = (q ?? '').trim().slice(0, 100);
    if (!query) return [];
    const rows = await this.sites
      .find({ $text: { $search: query } }, { score: { $meta: 'textScore' }, address: 1, title: 1, text: 1 })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.map((r) => ({ address: r.address, title: r.title, snippet: snippet(r.text, terms) }));
  }

  @Post('sites')
  async publish(@Body() body: { person?: string; address?: string; title?: string; html?: string }) {
    const address = normalizeAddress(body.address ?? '');
    const title = (body.title ?? '').trim();
    const html = body.html ?? '';
    if (!body.person || !(await this.people.exists({ name: body.person }))) {
      throw new BadRequestException('unknown person');
    }
    if (!isValidAddress(address)) throw new BadRequestException('address must look like name.zz');
    if (!title || title.length > 120) throw new BadRequestException('title required, max 120 characters');
    if (!html.trim() || html.length > 50000) throw new BadRequestException('html required, max 50000 characters');
    const text = toText(html);
    if (!text) throw new BadRequestException('page has no readable text');
    try {
      await this.sites.create({ address, title, author: body.person, html: cleanHtml(html), text });
    } catch (e: any) {
      if (e?.code === 11000) throw new ConflictException('address already taken');
      throw e;
    }
    return { address, title, author: body.person };
  }
}