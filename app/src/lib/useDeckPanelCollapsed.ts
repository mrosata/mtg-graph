import { useSyncExternalStore } from 'react';

export const STORAGE_KEY = 'mtg-graph:deck-panel-collapsed';

function read(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function write(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // ignore — private mode etc.
  }
}

// Module-level pub/sub so every component using this hook sees the same value
// in real time. InteractionsPanel positions its hover preview based on the
// deck rail's width, so it needs to re-render the moment DeckPanel toggles.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function setCollapsedShared(value: boolean) {
  write(value);
  listeners.forEach((cb) => cb());
}

export function useDeckPanelCollapsed(): readonly [boolean, (value: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, read, read);
  return [collapsed, setCollapsedShared] as const;
}
