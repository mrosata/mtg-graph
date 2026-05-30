import { useCallback, useState } from 'react';

type State = { stack: string[]; idx: number };

export type CardNav = {
  push: (id: string | null) => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
};

/**
 * Drawer-scoped card navigation stack. Tracks the order in which the user
 * opened cards so the drawer can offer back/forward buttons independent of
 * browser history. `writeCard` is whatever side effect updates the URL/state
 * showing the focused card.
 */
export function useCardNav(writeCard: (id: string | null) => void): CardNav {
  const [history, setHistory] = useState<State>({ stack: [], idx: -1 });

  const push = useCallback((id: string | null) => {
    setHistory(({ stack, idx }) => {
      if (id === null) return { stack, idx: -1 };
      const truncated = stack.slice(0, idx + 1);
      if (truncated[truncated.length - 1] === id) {
        return { stack: truncated, idx: truncated.length - 1 };
      }
      truncated.push(id);
      return { stack: truncated, idx: truncated.length - 1 };
    });
    writeCard(id);
  }, [writeCard]);

  const back = useCallback(() => {
    setHistory((h) => {
      if (h.idx <= 0) {
        writeCard(null);
        return { ...h, idx: -1 };
      }
      const newIdx = h.idx - 1;
      writeCard(h.stack[newIdx] ?? null);
      return { ...h, idx: newIdx };
    });
  }, [writeCard]);

  const forward = useCallback(() => {
    setHistory((h) => {
      if (h.idx >= h.stack.length - 1) return h;
      const newIdx = h.idx + 1;
      writeCard(h.stack[newIdx] ?? null);
      return { ...h, idx: newIdx };
    });
  }, [writeCard]);

  return {
    push,
    back,
    forward,
    canBack: history.idx >= 0,
    canForward: history.idx < history.stack.length - 1,
  };
}
