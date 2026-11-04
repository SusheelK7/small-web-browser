import { describe, expect, it } from 'vitest';
import { canGoBack, canGoForward, current, initialNav, navReducer, NavAction, NavState } from './nav';

const go = (address: string, y = 0): NavAction => ({
  type: 'navigate',
  target: { kind: 'page', address },
  leavingScrollY: y,
});
const search = (query: string, y = 0): NavAction => ({
  type: 'navigate',
  target: { kind: 'search', query },
  leavingScrollY: y,
});
const back = (y = 0): NavAction => ({ type: 'back', leavingScrollY: y });
const forward = (y = 0): NavAction => ({ type: 'forward', leavingScrollY: y });
const run = (actions: NavAction[], start: NavState = initialNav) => actions.reduce(navReducer, start);
const addr = (s: NavState) => {
  const c = current(s);
  return c && c.kind === 'page' ? c.address : null;
};

describe('navReducer', () => {
  it('starts empty', () => {
    expect(current(initialNav)).toBeNull();
    expect(canGoBack(initialNav)).toBe(false);
    expect(canGoForward(initialNav)).toBe(false);
  });

  it('first navigation has nothing to go back to', () => {
    const s = run([go('a.zz')]);
    expect(s.entries).toHaveLength(1);
    expect(canGoBack(s)).toBe(false);
  });

  it('goes back and forward across a trail four deep', () => {
    const s = run([go('a.zz'), go('b.zz'), go('c.zz'), go('d.zz'), back(), back()]);
    expect(addr(s)).toBe('b.zz');
    expect(canGoForward(s)).toBe(true);
    expect(addr(run([forward()], s))).toBe('c.zz');
  });

  it('loses forward entries when navigating from the middle', () => {
    const s = run([go('a.zz'), go('b.zz'), go('c.zz'), back(), back(), go('x.zz')]);
    expect(s.entries.map((e) => (e.kind === 'page' ? e.address : e.query))).toEqual(['a.zz', 'x.zz']);
    expect(canGoForward(s)).toBe(false);
  });

  it('does nothing when going back at the start', () => {
    const s = run([go('a.zz')]);
    expect(navReducer(s, back())).toBe(s);
  });

  it('does nothing when going forward at the end', () => {
    const s = run([go('a.zz'), go('b.zz')]);
    expect(navReducer(s, forward())).toBe(s);
  });

  it('does not add an entry when navigating to the current address', () => {
    const s = run([go('a.zz'), go('b.zz')]);
    expect(navReducer(s, go('b.zz'))).toBe(s);
  });

  it('saves scroll on leaving and restores it on return', () => {
    const s = run([go('a.zz'), go('b.zz', 300), back(50)]);
    expect(addr(s)).toBe('a.zz');
    expect(current(s)?.scrollY).toBe(300);
    expect(s.entries[1].scrollY).toBe(50);
  });

  it('keeps a search entry so going back returns to its results', () => {
    const s = run([go('a.zz'), search('fog', 10), go('fogcatalog.zz', 120), back(0)]);
    const c = current(s);
    expect(c?.kind).toBe('search');
    expect(c?.scrollY).toBe(120);
    expect(c && c.kind === 'search' ? c.query : null).toBe('fog');
  });

  it('can go forward again after returning to search results', () => {
    const s = run([search('fog'), go('fogcatalog.zz'), back(), forward()]);
    expect(addr(s)).toBe('fogcatalog.zz');
  });

  it('keeps unknown addresses in the trail', () => {
    const s = run([go('a.zz'), go('lostcoast.zz'), back()]);
    expect(addr(s)).toBe('a.zz');
    expect(canGoForward(s)).toBe(true);
  });
});