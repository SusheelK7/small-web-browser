'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { PageResult, Via } from '@/lib/api';
import { normalizeAddress } from '@/lib/address';
import { buildSrcDoc } from '@/lib/frame';
import { canGoBack, canGoForward, current, initialNav, navReducer } from '@/lib/nav';
import type { Target } from '@/lib/nav';
const styles = new Proxy({} as Record<string, string>, { get: (_t, key) => String(key) });

type View =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; key: string; result: PageResult };

export default function Browser({ person }: { person: string }) {
  const [nav, dispatch] = useReducer(navReducer, initialNav);
  const [input, setInput] = useState('');
  const [view, setView] = useState<View>({ status: 'idle' });
  const scrollRef = useRef(0);
  const viaRef = useRef<Via>('typed');
  const frameRef = useRef<HTMLIFrameElement>(null);

  const entry = current(nav);
  const address = entry && entry.kind === 'page' ? entry.address : null;
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

  useEffect(() => {
    if (!address) {
      setView({ status: 'idle' });
      return;
    }
    let cancelled = false;
    const via = viaRef.current;
    scrollRef.current = restoreY;
    setInput(address);
    setView({ status: 'loading' });
    api
      .page(address)
      .then((result) => {
        if (cancelled) return;
        setView({ status: 'done', key: 'p:' + address, result });
        api.visit(person, address, via).catch(() => undefined);
      })
      .catch((e: Error) => {
        if (!cancelled) setView({ status: 'error', message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [nav.index, address, restoreY, person]);

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

  const result = view.status === 'done' && view.key === targetKey ? view.result : null;

  const srcDoc = useMemo(() => {
    if (!result || !result.found) return '';
    return buildSrcDoc(result.html, restoreY, crypto.randomUUID());
  }, [result, restoreY]);

  let body: ReactNode;
  if (!entry) {
    body = (
      <div className={styles.notice}>
        <h2>Start here</h2>
        <p>Type an address such as tidepool.zz and press Enter.</p>
      </div>
    );
  } else if (entry.kind === 'search') {
    body = (
      <div className={styles.notice}>
        <h2>Search</h2>
        <p>Search results arrive in the next step.</p>
      </div>
    );
  } else if (view.status === 'error') {
    body = (
      <div className={styles.notice}>
        <h2>Cannot load this page</h2>
        <p>{view.message}</p>
      </div>
    );
  } else if (!result) {
    body = (
      <div className={styles.notice}>
        <p>Loading…</p>
      </div>
    );
  } else if (!result.found) {
    body = (
      <div className={styles.notice}>
        <h2>Nowhere</h2>
        <p>No site lives at {result.address}.</p>
      </div>
    );
  } else {
    body = (
      <>
        <div className={styles.meta}>
          {result.title} · by {result.author}
        </div>
        <iframe
          key={nav.index + ':' + targetKey}
          ref={frameRef}
          className={styles.frame}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          title={result.title}
        />
      </>
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
      </div>
      <div className={styles.stage}>{body}</div>
    </>
  );
}