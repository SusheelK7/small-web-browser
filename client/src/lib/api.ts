const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type Via = 'typed' | 'link' | 'back' | 'forward' | 'history' | 'search';

export type PageResult =
  | { found: false; address: string }
  | { found: true; address: string; title: string; author: string; html: string };

export type SearchHit = { address: string; title: string; snippet: string };

export type HistoryItem = {
  id: string;
  address: string;
  title: string | null;
  via: string;
  found: boolean;
  at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? message);
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  people: () => request<string[]>('/people'),
  page: (address: string) => request<PageResult>('/pages?address=' + encodeURIComponent(address)),
  visit: (person: string, address: string, via: Via) =>
    request<{ id: string }>('/visits', post({ person, address, via })),
  history: (person: string) =>
    request<HistoryItem[]>('/history?person=' + encodeURIComponent(person) + '&limit=200'),
  search: (q: string) => request<SearchHit[]>('/search?q=' + encodeURIComponent(q)),
  publish: (body: { person: string; address: string; title: string; html: string }) =>
    request<{ address: string }>('/sites', post(body)),
};