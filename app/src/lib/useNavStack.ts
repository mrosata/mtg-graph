import { useCallback, useEffect, useRef, useState } from 'react';

type NavState = { __navIdx?: number; [k: string]: unknown };

function readIdx(): number {
  const s = window.history.state as NavState | null;
  return typeof s?.__navIdx === 'number' ? s.__navIdx : 0;
}

function writeIdx(idx: number) {
  const existing = (window.history.state as NavState | null) ?? {};
  window.history.replaceState({ ...existing, __navIdx: idx }, '');
}

export function useNavStack() {
  const [currentIdx, setCurrentIdx] = useState<number>(() => readIdx());
  const maxIdxRef = useRef<number>(currentIdx);

  // Seed history.state with __navIdx if missing, so future reads are consistent.
  useEffect(() => {
    const s = window.history.state as NavState | null;
    if (typeof s?.__navIdx !== 'number') {
      writeIdx(0);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const idx = readIdx();
      setCurrentIdx(idx);
      // Do NOT touch maxIdxRef — forward stays reachable until a new push.
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const markPush = useCallback(() => {
    // Called immediately after a push. Browser truncated forward history, so the
    // new entry's index is currentIdx + 1 — never past the prior max.
    const next = currentIdx + 1;
    writeIdx(next);
    maxIdxRef.current = next;
    setCurrentIdx(next);
  }, [currentIdx]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  return {
    canBack: currentIdx > 0,
    canForward: currentIdx < maxIdxRef.current,
    markPush,
    goBack,
    goForward,
  };
}
