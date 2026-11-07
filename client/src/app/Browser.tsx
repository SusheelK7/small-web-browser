'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { HistoryItem, PageResult, SearchHit, Via } from '@/lib/api';
import { normalizeAddress } from '@/lib/address';
import { buildSrcDoc } from '@/lib/frame';
import { canGoBack, canGoForward, current, initialNav, navReducer } from '@/lib/nav';
import type { Target } from '@/lib/nav';

const styles = new Proxy({} as Record<string, string>, { get: (_t, key) => String(key) });

type View =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'page'; key: string; result: PageResult }
  | { status: 'search'; key: string; hits: SearchHit[] };

type Panel = 'history' | 'publish' | null;

function PublishForm({ person, onDone }: { person: string; onDone: (address: string) => void }) {
  const [address, setAddress] = useState('');
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.publish({ person, address: normalizeAddress(address), title, html });
      setAddress('');
      setTitle('');
      setHtml('');
      onDone(res.address);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <h3>Publish a site</h3>
      <p className={styles.muted}>
        Link to other sites with a bare address, like href="tidepool.zz". Scripts, forms and external resources are removed.
      </p>
      <label>Address (name.zz)</label>
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="mysite.zz" spellCheck={false} />
      <label>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Site" />
      <label>HTML</label>
      <textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h1>Hello</h1><p>Written by me.</p>" />
      <button type="submit" disabled={busy}>
        {busy ? 'Publishing…' : 'Publish'}
      </button>
      {error && <div className={styles.formErr}>{error}</div>}
    </form>
  );
}

export default function Browser({ person }: { person: string }) {
  const [nav, dispatch] = useReducer(navReducer, initialNav);
  const [input, setInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [view, setView] = useState<View>({ status: 'idle' });
  const [panel, setPanel] = useState<Panel>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [histTick, setHistTick] = useState(0);
  const scrollRef = useRef(0);
  const viaRef = useRef<Via>('typed');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const entry = current(nav);
  const restoreY = entry ? entry.scrollY : 0;
  const targetKey = entry ? (entry.kind === 'page' ? 'p:' + entry.address : 's:' + entry.query) : '';

  const go = useCallback((target: Target, via: Via) => {
    viaRef.current = via;
    dispatch({ type: 'navigate', target, leavingScrollY: scrollRef.current });
  }, []);

  const back = () => {
    viaRef.current = 'back';
    dispatch({ type: 'back', leavingScrollY: scrollRef.current });
  };

  const forward = () => {
    viaRef.current = 'forward';
    dispatch({ type: 'forward', leavingScrollY: scrollRef.current });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = normalizeAddress(input);
    if (next) go({ kind: 'page', address: next }, 'typed');
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (query) go({ kind: 'search', query }, 'typed');
  };

  useEffect(() => {
    if (!entry) {
      setView({ status: 'idle' });
      return;
    }
    let cancelled = false;
    const via = viaRef.current;
    scrollRef.current = restoreY;
    setView({ status: 'loading' });

    if (entry.kind === 'page') {
      const address = entry.address;
      setInput(address);
      api
        .page(address)
        .then((result) => {
          if (cancelled) return;
          setView({ status: 'page', key: 'p:' + address, result });
          api
            .visit(person, address, via)
            .then(() => setHistTick((t) => t + 1))
            .catch(() => undefined);
        })
        .catch((e: Error) => {
          if (!cancelled) setView({ status: 'error', message: e.message });
        });
    } else {
      const query = entry.query;
      setSearchInput(query);
      api
        .search(query)
        .then((hits) => {
          if (!cancelled) setView({ status: 'search', key: 's:' + query, hits });
        })
        .catch((e: Error) => {
          if (!cancelled) setView({ status: 'error', message: e.message });
        });
    }

    return () => {
      cancelled = true;
    };
  }, [nav.index, targetKey, restoreY, person]);

  useEffect(() => {
    if (panel !== 'history') return;
    let cancelled = false;
    api
      .history(person)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [panel, person, histTick]);

  useEffect(() => {
    if (view.status === 'search' && listRef.current) listRef.current.scrollTop = restoreY;
  }, [view, restoreY]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'scroll' && Number.isFinite(d.y)) scrollRef.current = d.y;
      if (d.type === 'link' && typeof d.href === 'string') {
        const next = normalizeAddress(d.href);
        if (next) go({ kind: 'page', address: next }, 'link');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [go]);

  const matches = (view.status === 'page' || view.status === 'search') && view.key === targetKey;
  const pageResult = matches && view.status === 'page' ? view.result : null;
  const searchHits = matches && view.status === 'search' ? view.hits : null;

  const srcDoc = useMemo(() => {
    if (!pageResult || !pageResult.found) return '';
    return buildSrcDoc(pageResult.html, restoreY, crypto.randomUUID());
  }, [pageResult, restoreY]);

  let body: ReactNode;
  if (!entry) {
    body = (
      <div className={styles.notice}>
        <h2>Start here</h2>
        <p>Type an address such as tidepool.zz and press Enter, or search for a word.</p>
      </div>
    );
  } else if (view.status === 'error') {
    body = (
      <div className={styles.notice}>
        <h2>Cannot load this page</h2>
        <p>{view.message}</p>
      </div>
    );
  } else if (entry.kind === 'search' && searchHits) {
    body = (
      <div
        className={styles.results}
        ref={listRef}
        onScroll={(e) => {
          scrollRef.current = e.currentTarget.scrollTop;
        }}
      >
        <h2>Results for “{entry.query}”</h2>
        {searchHits.length === 0 && <p className={styles.muted}>No pages match.</p>}
        {searchHits.map((h) => (
          <button
            key={h.address}
            className={styles.hit}
            onClick={() => go({ kind: 'page', address: h.address }, 'search')}
          >
            <span className={styles.hitTitle}>{h.title}</span>
            <span className={styles.hitAddr}>{h.address}</span>
            <span className={styles.hitSnippet}>{h.snippet}</span>
          </button>
        ))}
      </div>
    );
  } else if (entry.kind === 'page' && pageResult) {
    if (!pageResult.found) {
      body = (
        <div className={styles.notice}>
          <h2>Nowhere</h2>
          <p>No site lives at {pageResult.address}.</p>
        </div>
      );
    } else {
      body = (
        <>
          <div className={styles.meta}>
            {pageResult.title} · by {pageResult.author}
          </div>
          <iframe
            key={nav.index + ':' + targetKey}
            ref={frameRef}
            className={styles.frame}
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            title={pageResult.title}
          />
        </>
      );
    }
  } else {
    body = (
      <div className={styles.notice}>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.chrome}>
        <button className={styles.nav} onClick={back} disabled={!canGoBack(nav)} aria-label="Back">
          ←
        </button>
        <button className={styles.nav} onClick={forward} disabled={!canGoForward(nav)} aria-label="Forward">
          →
        </button>
        <form className={styles.bar} onSubmit={submit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type an address, e.g. tidepool.zz"
            spellCheck={false}
            autoCapitalize="off"
          />
          <button className={styles.go} type="submit">
            Go
          </button>
        </form>
        <form className={styles.searchBar} onSubmit={submitSearch}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search all pages"
          />
          <button className={styles.go} type="submit">
            Search
          </button>
        </form>
        <button className={styles.tool} onClick={() => setPanel(panel === 'history' ? null : 'history')}>
          History
        </button>
        <button className={styles.tool} onClick={() => setPanel(panel === 'publish' ? null : 'publish')}>
          Publish
        </button>
      </div>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.stage}>{body}</div>
        </div>
        {panel && (
          <aside className={styles.side}>
            {panel === 'history' ? (
              <>
                <h3>History · {person}</h3>
                {items.length === 0 && <p className={styles.muted}>No visits yet.</p>}
                <ul className={styles.hist}>
                  {items.map((it) => (
                    <li key={it.id}>
                      <button
                        className={styles.histItem}
                        onClick={() => go({ kind: 'page', address: it.address }, 'history')}
                      >
                        <span className={styles.histTitle}>{it.found ? (it.title ?? it.address) : 'Nowhere'}</span>
                        <span className={styles.histAddr}>{it.address}</span>
                        <span className={styles.histMeta}>
                          {it.via} · {new Date(it.at).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <PublishForm person={person} onDone={(address) => go({ kind: 'page', address }, 'typed')} />
            )}
          </aside>
        )}
      </div>
    </>
  );
}