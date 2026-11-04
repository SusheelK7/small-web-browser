export type Target =
  | { kind: 'page'; address: string }
  | { kind: 'search'; query: string };

export type Entry = Target & { scrollY: number };

export type NavState = { entries: Entry[]; index: number };

export type NavAction =
  | { type: 'navigate'; target: Target; leavingScrollY: number }
  | { type: 'back'; leavingScrollY: number }
  | { type: 'forward'; leavingScrollY: number };

export const initialNav: NavState = { entries: [], index: -1 };

export const canGoBack = (s: NavState) => s.index > 0;
export const canGoForward = (s: NavState) => s.index < s.entries.length - 1;
export const current = (s: NavState): Entry | null => s.entries[s.index] ?? null;

function sameTarget(a: Target, b: Target) {
  if (a.kind === 'page' && b.kind === 'page') return a.address === b.address;
  if (a.kind === 'search' && b.kind === 'search') return a.query === b.query;
  return false;
}

function withScroll(s: NavState, y: number): Entry[] {
  if (s.index < 0) return s.entries;
  return s.entries.map((e, i) => (i === s.index ? { ...e, scrollY: y } : e));
}

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'navigate': {
      const cur = current(state);
      if (cur && sameTarget(cur, action.target)) return state;
      const saved = withScroll(state, action.leavingScrollY);
      const entries: Entry[] = [
        ...saved.slice(0, state.index + 1),
        { ...action.target, scrollY: 0 },
      ];
      return { entries, index: entries.length - 1 };
    }
    case 'back': {
      if (!canGoBack(state)) return state;
      return { entries: withScroll(state, action.leavingScrollY), index: state.index - 1 };
    }
    case 'forward': {
      if (!canGoForward(state)) return state;
      return { entries: withScroll(state, action.leavingScrollY), index: state.index + 1 };
    }
  }
}