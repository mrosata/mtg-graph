// app/src/stores/deckStore.ts
import { create } from 'zustand';
import { db, type Deck, type DeckCard } from '../lib/db';
import type { ResolvedEntry } from '../lib/deckImport';

const ACTIVE_DECK_KEY = 'mtg-graph:activeDeckId';

function readActiveDeckId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_DECK_KEY);
  } catch {
    return null;
  }
}

function writeActiveDeckId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_DECK_KEY, id);
    else window.localStorage.removeItem(ACTIVE_DECK_KEY);
  } catch {
    // ignore — localStorage can be unavailable in private mode
  }
}

export type DeckTarget = 'main' | 'sideboard';

type DeckState = {
  decks: Deck[];
  activeDeckId: string | null;
  load: () => Promise<void>;
  createDeck: (name: string) => Promise<string>;
  importDeck: (
    name: string | null,
    resolved: ResolvedEntry[],
    sideboard?: ResolvedEntry[],
  ) => Promise<string>;
  setActiveDeck: (id: string | null) => void;
  renameDeck: (id: string, name: string) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  addCard: (
    oracleId: string,
    qty: number,
    name?: string,
    target?: DeckTarget,
  ) => Promise<void>;
  removeCard: (oracleId: string, qty: number, target?: DeckTarget) => Promise<void>;
  saveDeck: (id: string) => Promise<void>;
  discardChanges: (id: string) => Promise<void>;
  restoreRemoved: (oracleId: string) => Promise<void>;
  applyLandFill: (plan: { add: { oracleId: string; count: number }[]; remove: { oracleId: string; count: number }[] }) => Promise<void>;
};

function newId(): string {
  return crypto.randomUUID();
}

async function persist(deck: Deck): Promise<void> {
  await db.decks.put(deck);
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  // Restored synchronously from localStorage so the first render sees the previous
  // active deck. load() will validate it once decks come back from Dexie.
  activeDeckId: readActiveDeckId(),

  load: async () => {
    const decks = await db.decks.toArray();
    // If the persisted active deck no longer exists, drop it.
    const stored = readActiveDeckId();
    const activeDeckId = stored && decks.some((d) => d.id === stored) ? stored : null;
    if (activeDeckId !== stored) writeActiveDeckId(activeDeckId);
    set({ decks, activeDeckId });
  },

  createDeck: async (name) => {
    const now = Date.now();
    const deck: Deck = {
      id: newId(), name, format: 'standard',
      originalCards: [], workingCards: [],
      originalSideboardCards: [], sideboardCards: [],
      createdAt: now, updatedAt: now,
    };
    await persist(deck);
    writeActiveDeckId(deck.id);
    set({ decks: [...get().decks, deck], activeDeckId: deck.id });
    return deck.id;
  },

  importDeck: async (name, resolved, sideboard = []) => {
    const now = Date.now();
    const finalName = name ?? `Imported deck ${get().decks.length + 1}`;
    const toDeckCard = (e: ResolvedEntry) => {
      const dc: DeckCard = { oracleId: e.oracleId, count: e.count, name: e.name };
      if (e.mtgoId !== undefined) dc.mtgoId = e.mtgoId;
      return dc;
    };
    const deck: Deck = {
      id: newId(), name: finalName, format: 'standard',
      originalCards: resolved.map(toDeckCard),
      workingCards: resolved.map(toDeckCard),
      originalSideboardCards: sideboard.map(toDeckCard),
      sideboardCards: sideboard.map(toDeckCard),
      createdAt: now, updatedAt: now,
    };
    await persist(deck);
    writeActiveDeckId(deck.id);
    set({ decks: [...get().decks, deck], activeDeckId: deck.id });
    return deck.id;
  },

  setActiveDeck: (id) => {
    writeActiveDeckId(id);
    set({ activeDeckId: id });
  },

  renameDeck: async (id, name) => {
    const decks = get().decks.map((d) =>
      d.id === id ? { ...d, name, updatedAt: Date.now() } : d,
    );
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },

  deleteDeck: async (id) => {
    await db.decks.delete(id);
    const nextActive = get().activeDeckId === id ? null : get().activeDeckId;
    if (nextActive !== get().activeDeckId) writeActiveDeckId(nextActive);
    set({
      decks: get().decks.filter((d) => d.id !== id),
      activeDeckId: nextActive,
    });
  },

  addCard: async (oracleId, qty, name, target = 'main') => {
    const id = get().activeDeckId;
    if (!id) throw new Error('No active deck');
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      const source = target === 'main' ? d.workingCards : (d.sideboardCards ?? []);
      const existing = source.find((c) => c.oracleId === oracleId);
      const next: DeckCard[] = existing
        ? source.map((c) =>
            c.oracleId === oracleId ? { ...c, count: c.count + qty, name: c.name ?? name } : c,
          )
        : [...source, name ? { oracleId, count: qty, name } : { oracleId, count: qty }];
      return target === 'main' ? { ...d, workingCards: next } : { ...d, sideboardCards: next };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },

  removeCard: async (oracleId, qty, target = 'main') => {
    const id = get().activeDeckId;
    if (!id) throw new Error('No active deck');
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      const source = target === 'main' ? d.workingCards : (d.sideboardCards ?? []);
      const next = source
        .map((c) => (c.oracleId === oracleId ? { ...c, count: c.count - qty } : c))
        .filter((c) => c.count > 0);
      return target === 'main' ? { ...d, workingCards: next } : { ...d, sideboardCards: next };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },

  saveDeck: async (id) => {
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      return {
        ...d,
        originalCards: d.workingCards.map((c) => ({ ...c })),
        originalSideboardCards: (d.sideboardCards ?? []).map((c) => ({ ...c })),
        updatedAt: Date.now(),
      };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },

  discardChanges: async (id) => {
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      return {
        ...d,
        workingCards: d.originalCards.map((c) => ({ ...c })),
        sideboardCards: (d.originalSideboardCards ?? []).map((c) => ({ ...c })),
      };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },

  restoreRemoved: async (oracleId) => {
    const id = get().activeDeckId;
    if (!id) throw new Error('No active deck');
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      const orig = d.originalCards.find((c) => c.oracleId === oracleId);
      if (!orig) return d; // not in original — no-op
      if (d.workingCards.find((c) => c.oracleId === oracleId)) return d; // already present — no-op
      const restored = orig.name
        ? { oracleId, count: orig.count, name: orig.name }
        : { oracleId, count: orig.count };
      return { ...d, workingCards: [...d.workingCards, restored] };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },

  applyLandFill: async (plan) => {
    const id = get().activeDeckId;
    if (!id) throw new Error('No active deck');
    const decks = get().decks.map((d) => {
      if (d.id !== id) return d;
      let working: DeckCard[] = d.workingCards.slice();
      for (const r of plan.remove) {
        working = working
          .map((c) => (c.oracleId === r.oracleId ? { ...c, count: c.count - r.count } : c))
          .filter((c) => c.count > 0);
      }
      for (const a of plan.add) {
        const existing = working.find((c) => c.oracleId === a.oracleId);
        if (existing) {
          working = working.map((c) =>
            c.oracleId === a.oracleId ? { ...c, count: c.count + a.count } : c,
          );
        } else {
          working = [...working, { oracleId: a.oracleId, count: a.count }];
        }
      }
      return { ...d, workingCards: working, updatedAt: Date.now() };
    });
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
  },
}));

// Canonical selector for the active deck. Returns null when none is set or the
// stored id no longer resolves. Reference-stable: unrelated deck mutations keep
// the existing Deck object identity, so subscribers don't re-render.
export function useActiveDeck(): Deck | null {
  return useDeckStore((s) =>
    s.activeDeckId ? s.decks.find((d) => d.id === s.activeDeckId) ?? null : null,
  );
}
