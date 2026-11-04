import 'dotenv/config';
import mongoose from 'mongoose';
import { PersonSchema, SiteSchema, VisitSchema } from './schemas';
import { normalizeAddress } from './common/address';
import { cleanHtml, toText } from './common/sanitize';

const people = ['Maya', 'Idris', 'Noor', 'Tomas', 'Lena'];

const sites = [
  {
    address: 'tidepool.zz',
    title: 'Tidepool Notes',
    author: 'Maya',
    html: '<h1>Tidepool Notes</h1><p>At low tide the rocks below the pier turn into a small city. Anemones close like fists, hermit crabs trade shells, and the whole place smells of salt and iodine.</p><p>See also <a href="saltmarsh.zz">the saltmarsh survey</a> and <a href="kelpforest.zz">kelp forest diary</a>. An old guide lives at <a href="lostcoast.zz">lostcoast.zz</a>.</p>',
  },
  {
    address: 'saltmarsh.zz',
    title: 'Saltmarsh Survey',
    author: 'Maya',
    html: '<h1>Saltmarsh Survey</h1><p>Counting the birds of the estuary every Sunday since spring. Redshanks are loud, godwits are patient, and the heron never moves until it does.</p><p>Back to <a href="tidepool.zz">tidepool.zz</a> or read <a href="breadlog.zz">the bread log</a> for a change of pace.</p>',
  },
  {
    address: 'breadlog.zz',
    title: 'The Bread Log',
    author: 'Idris',
    html: '<h1>The Bread Log</h1><p>Day 41 of the same sourdough starter. Hydration at seventy percent gives an open crumb but a sticky shaping session. Rye flour in the feed makes it livelier.</p><p>Thinking about <a href="kelpforest.zz">seaweed flour</a> next, a bad idea I intend to try anyway.</p>',
  },
    {
    address: 'kelpforest.zz',
    title: 'Kelp Forest Diary',
    author: 'Noor',
    html: '<h1>Kelp Forest Diary</h1><p>Forty minutes under the canopy, and the light comes down in green ropes. Urchins graze the holdfasts, sea otters wrap themselves in blades to sleep, and everything sways in one slow direction.</p><p>The shallows above are mapped at <a href="tidepool.zz">tidepool.zz</a>. Dried kelp also turns up in the kitchen, see <a href="breadlog.zz">the bread log</a>, and the cold current that feeds this forest is described in <a href="fogcatalog.zz">the fog catalog</a>.</p>',
  },
  {
    address: 'fogcatalog.zz',
    title: 'Fog Catalog',
    author: 'Tomas',
    html: '<h1>Fog Catalog</h1><p>Radiation fog, advection fog, valley fog, and the sea fog that arrives with the afternoon wind. Each entry lists where it forms, how long it stays, and what it does to sound.</p><p>Fog muffles a harbour until a single bell carries for miles. Compare notes with <a href="nightbus.zz">the night bus timetable</a> or follow the coast to <a href="kelpforest.zz">the kelp forest</a>. A chapter on mountain cloud was promised at <a href="highpasses.zz">highpasses.zz</a>.</p>',
  },
  {
    address: 'nightbus.zz',
    title: 'Night Bus Timetable',
    author: 'Lena',
    html: '<h1>Night Bus Timetable</h1><p>The 7 leaves the depot at 23:40 and the 12 never comes when it rains. This is an unofficial timetable kept by people who ride it, with notes on which stops have a bench and which have only a pole.</p><p>The driver on the 7 says the fog is worst by the river. Late riders can read <a href="lanternpost.zz">the lantern post</a> while waiting, or plan a walk with <a href="mapsofnowhere.zz">maps of nowhere</a>.</p>',
  },
  {
    address: 'lanternpost.zz',
    title: 'Lantern Post',
    author: 'Tomas',
    html: '<h1>Lantern Post</h1><p>A newsletter of small night markets: the roasted chestnut seller, the man who repairs umbrellas, the stall that only sells salt in six colours. Everything here is written standing up, in the cold, with cold hands.</p><p>Getting there is half of it, so check <a href="nightbus.zz">the night bus timetable</a>. For daytime walks see <a href="mossandstone.zz">moss and stone</a>.</p>',
  },
  {
    address: 'mapsofnowhere.zz',
    title: 'Maps of Nowhere',
    author: 'Lena',
    html: '<h1>Maps of Nowhere</h1><p>Hand-drawn maps of places that are almost places: a field with a gate but no fence, a road that ends at a lake, a village that only exists on one old survey. The scale is always in walking minutes.</p><p>Start with the estuary sketch from <a href="saltmarsh.zz">the saltmarsh survey</a>. Some maps remain unfinished, like the one promised at <a href="ghosttown.zz">ghosttown.zz</a>. Back to the <a href="nightbus.zz">night buses</a>.</p>',
  },
  {
    address: 'mossandstone.zz',
    title: 'Moss and Stone',
    author: 'Noor',
    html: '<h1>Moss and Stone</h1><p>A slow catalogue of walls: dry stone, lime mortar, and the moss that moves in when nobody is looking. Moss prefers the north face, holds water like a sponge, and is happiest in fog.</p><p>For damp air at its finest read <a href="fogcatalog.zz">the fog catalog</a>. Rusted bike frames lean against many of these walls, so see <a href="cyclerepair.zz">the bicycle repair handbook</a>, and the coast awaits at <a href="kelpforest.zz">the kelp forest</a>.</p>',
  },
  {
    address: 'cyclerepair.zz',
    title: 'Bicycle Repair Handbook',
    author: 'Idris',
    html: '<h1>Bicycle Repair Handbook</h1><p>Fix a puncture in nine minutes: lever the tyre off, find the thorn, patch the tube, and check the inside of the tyre before it goes back on. A little chalk on the patch keeps the glue from sticking where it should not.</p><p>Greasy hands belong in the kitchen afterwards, where <a href="breadlog.zz">the bread log</a> is waiting. A chapter on wheel truing is planned at <a href="wheeltruing.zz">wheeltruing.zz</a>.</p>',
  },
];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE = Date.UTC(2026, 0, 1, 10, 0, 0);
const addrs = sites.map((s) => s.address);
const linksOf = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => normalizeAddress(m[1]));
const outgoing = new Map(sites.map((s) => [s.address, linksOf(s.html)]));

function trail(steps: number, seed: number, sweep: boolean) {
  const r = rng(seed);
  const out: { address: string; via: string }[] = [];
  if (sweep) addrs.forEach((a) => out.push({ address: a, via: 'typed' }));
  let cur = addrs[Math.floor(r() * addrs.length)];
  out.push({ address: cur, via: 'typed' });
  for (let i = 1; i < steps; i++) {
    const links = outgoing.get(cur) ?? [];
    if (links.length && r() < 0.75) {
      cur = links[Math.floor(r() * links.length)];
      out.push({ address: cur, via: 'link' });
    } else {
      cur = addrs[Math.floor(r() * addrs.length)];
      out.push({ address: cur, via: 'typed' });
    }
  }
  return out;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const Person = mongoose.model('Person', PersonSchema);
  const Site = mongoose.model('Site', SiteSchema);
  const Visit = mongoose.model('Visit', VisitSchema);

  await Person.bulkWrite(
    people.map((name) => ({ updateOne: { filter: { name }, update: { $set: { name } }, upsert: true } })),
  );

  await Site.bulkWrite(
    sites.map((s) => ({
      updateOne: {
        filter: { address: s.address },
        update: { $set: { address: s.address, title: s.title, author: s.author, html: cleanHtml(s.html), text: toText(s.html) } },
        upsert: true,
      },
    })),
  );

  const known = new Set(addrs);
  const visits: object[] = [];
  people.forEach((person, pi) => {
    const heavy = person === 'Maya';
    const steps = heavy ? 30 : 10 + pi * 3;
    const t = trail(steps, 1000 + pi, heavy);
    const gap = (60 * 60 * 1000) / t.length;
    t.forEach((v, i) => {
      visits.push({ person, address: v.address, via: v.via, found: known.has(v.address), at: new Date(BASE + Math.round(i * gap)) });
    });
  });

  await Visit.deleteMany({});
  await Visit.insertMany(visits);
  await Site.syncIndexes();
  await mongoose.disconnect();
}

main();