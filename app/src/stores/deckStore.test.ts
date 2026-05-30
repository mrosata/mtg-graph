import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useActiveDeck, useDeckStore } from './deckStore';
import { db, type Deck } from '../lib/db';
import type { ResolvedEntry } from '../lib/deckImport';
import { isDirty } from '../lib/deckDiff';

beforeEach(async () => {
  await db.decks.clear();
  useDeckStore.setState({ decks: [], activeDeckId: null });
});

describe('deckStore', () => {
  it('creates a new deck and sets it active', async () => {
    const id = await useDeckStore.getState().createDeck('My Deck');
    expect(useDeckStore.getState().activeDeckId).toBe(id);
    expect(useDeckStore.getState().decks).toHaveLength(1);
    expect(useDeckStore.getState().decks[0]?.name).toBe('My Deck');
  });

  it('adds a card to the active deck', async () => {
    const id = await useDeckStore.getState().createDeck('My Deck');
    await useDeckStore.getState().addCard('oracle-1', 1);
    const deck = useDeckStore.getState().decks.find((d) => d.id === id)!;
    expect(deck.workingCards).toEqual([{ oracleId: 'oracle-1', count: 1 }]);
  });

  it('increments count when adding the same card again', async () => {
    await useDeckStore.getState().createDeck('My Deck');
    await useDeckStore.getState().addCard('oracle-1', 1);
    await useDeckStore.getState().addCard('oracle-1', 3);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards[0]?.count).toBe(4);
  });

  it('persists an optional name on the deck entry when provided', async () => {
    await useDeckStore.getState().createDeck('My Deck');
    await useDeckStore.getState().addCard('oracle-1', 1, 'Lightning Bolt');
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards[0]).toEqual({ oracleId: 'oracle-1', count: 1, name: 'Lightning Bolt' });
  });

  it('omits the name field when adding without a name', async () => {
    await useDeckStore.getState().createDeck('My Deck');
    await useDeckStore.getState().addCard('oracle-1', 1);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards[0]).toEqual({ oracleId: 'oracle-1', count: 1 });
  });

  it('keeps a previously-persisted name when re-adding the same card without one', async () => {
    await useDeckStore.getState().createDeck('My Deck');
    await useDeckStore.getState().addCard('oracle-1', 1, 'Lightning Bolt');
    await useDeckStore.getState().addCard('oracle-1', 2);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards[0]).toEqual({ oracleId: 'oracle-1', count: 3, name: 'Lightning Bolt' });
  });

  it('removes a card when count reaches zero', async () => {
    await useDeckStore.getState().createDeck('My Deck');
    await useDeckStore.getState().addCard('oracle-1', 2);
    await useDeckStore.getState().removeCard('oracle-1', 2);
    expect(useDeckStore.getState().decks[0]?.workingCards).toEqual([]);
  });

  it('persists to IndexedDB and reloads', async () => {
    await useDeckStore.getState().createDeck('Persisted');
    await useDeckStore.getState().addCard('oracle-x', 1);
    // wipe in-memory state, reload from db
    useDeckStore.setState({ decks: [], activeDeckId: null });
    await useDeckStore.getState().load();
    expect(useDeckStore.getState().decks).toHaveLength(1);
    expect(useDeckStore.getState().decks[0]?.name).toBe('Persisted');
  });

  it('switches active deck', async () => {
    const id1 = await useDeckStore.getState().createDeck('A');
    const id2 = await useDeckStore.getState().createDeck('B');
    useDeckStore.getState().setActiveDeck(id1);
    expect(useDeckStore.getState().activeDeckId).toBe(id1);
    useDeckStore.getState().setActiveDeck(id2);
    expect(useDeckStore.getState().activeDeckId).toBe(id2);
  });
});

describe('useActiveDeck', () => {
  function makeDeck(id: string, overrides: Partial<Deck> = {}): Deck {
    return {
      id,
      name: id.toUpperCase(),
      format: 'standard',
      originalCards: [],
      workingCards: [],
      createdAt: 0,
      updatedAt: 0,
      ...overrides,
    };
  }

  it('returns null when no deck is active', () => {
    useDeckStore.setState({ decks: [makeDeck('a'), makeDeck('b')], activeDeckId: null });
    const { result } = renderHook(() => useActiveDeck());
    expect(result.current).toBeNull();
  });

  it('returns null when activeDeckId does not resolve to a deck', () => {
    useDeckStore.setState({ decks: [makeDeck('a')], activeDeckId: 'missing' });
    const { result } = renderHook(() => useActiveDeck());
    expect(result.current).toBeNull();
  });

  it('returns the matching deck when one is active', () => {
    const active = makeDeck('b', { name: 'Active' });
    useDeckStore.setState({ decks: [makeDeck('a'), active], activeDeckId: 'b' });
    const { result } = renderHook(() => useActiveDeck());
    expect(result.current).toBe(active);
  });

  it('keeps the same reference when an unrelated deck mutates', () => {
    const active = makeDeck('b', { name: 'Active' });
    const other = makeDeck('a', { name: 'Other' });
    useDeckStore.setState({ decks: [other, active], activeDeckId: 'b' });

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useActiveDeck();
    });
    const initial = result.current;
    expect(initial).toBe(active);
    const initialRenders = renderCount;

    act(() => {
      useDeckStore.setState({
        decks: [{ ...other, name: 'Other (renamed)' }, active],
      });
    });

    expect(result.current).toBe(initial);
    expect(renderCount).toBe(initialRenders);
  });
});

describe('importDeck', () => {
  it('creates a deck from resolved entries and sets it active', async () => {
    const entries: ResolvedEntry[] = [
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2, name: 'Counterspell' },
    ];
    const id = await useDeckStore.getState().importDeck('From Arena', entries);
    const deck = useDeckStore.getState().decks.find((d) => d.id === id)!;
    expect(deck.name).toBe('From Arena');
    expect(deck.workingCards).toEqual([
      { oracleId: 'a', count: 4, name: 'Lightning Bolt' },
      { oracleId: 'b', count: 2, name: 'Counterspell' },
    ]);
    expect(deck.originalCards).toEqual(deck.workingCards);
    expect(useDeckStore.getState().activeDeckId).toBe(id);
  });

  it('defaults to "Imported deck N" when no name is provided', async () => {
    await useDeckStore.getState().createDeck('Existing');
    const id = await useDeckStore.getState().importDeck(null, [
      { oracleId: 'a', count: 1, name: 'Lightning Bolt' },
    ]);
    const deck = useDeckStore.getState().decks.find((d) => d.id === id)!;
    expect(deck.name).toBe('Imported deck 2');
  });
});

describe('saveDeck', () => {
  it('copies workingCards into originalCards and clears dirty state', async () => {
    await useDeckStore.getState().createDeck('S');
    await useDeckStore.getState().addCard('a', 4);
    const before = useDeckStore.getState().decks[0]!;
    expect(isDirty(before)).toBe(true);

    await useDeckStore.getState().saveDeck(before.id);
    const after = useDeckStore.getState().decks[0]!;
    expect(after.originalCards).toEqual(after.workingCards);
    expect(isDirty(after)).toBe(false);
  });

  it('bumps updatedAt on save', async () => {
    const id = await useDeckStore.getState().createDeck('S');
    const created = useDeckStore.getState().decks[0]!;
    await new Promise((r) => setTimeout(r, 2));
    await useDeckStore.getState().addCard('a', 1);
    await useDeckStore.getState().saveDeck(id);
    const saved = useDeckStore.getState().decks[0]!;
    expect(saved.updatedAt).toBeGreaterThan(created.updatedAt);
  });

  it('deep-clones workingCards so later edits do not mutate originalCards', async () => {
    const id = await useDeckStore.getState().createDeck('S');
    await useDeckStore.getState().addCard('a', 4, 'Lightning Bolt');
    await useDeckStore.getState().saveDeck(id);
    // Mutating workingCards (via addCard) must not leak into originalCards
    await useDeckStore.getState().addCard('a', 1);
    const after = useDeckStore.getState().decks[0]!;
    expect(after.originalCards).toEqual([{ oracleId: 'a', count: 4, name: 'Lightning Bolt' }]);
    expect(after.workingCards).toEqual([{ oracleId: 'a', count: 5, name: 'Lightning Bolt' }]);
  });
});

describe('addCard / removeCard no longer bump updatedAt', () => {
  it('working edits leave updatedAt unchanged', async () => {
    await useDeckStore.getState().createDeck('S');
    const before = useDeckStore.getState().decks[0]!;
    await new Promise((r) => setTimeout(r, 2));
    await useDeckStore.getState().addCard('a', 1);
    await useDeckStore.getState().removeCard('a', 1);
    const after = useDeckStore.getState().decks[0]!;
    expect(after.updatedAt).toBe(before.updatedAt);
  });
});

describe('discardChanges', () => {
  it('reverts workingCards to originalCards', async () => {
    const id = await useDeckStore.getState().createDeck('D');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().addCard('b', 1);
    await useDeckStore.getState().removeCard('a', 4);

    await useDeckStore.getState().discardChanges(id);

    const after = useDeckStore.getState().decks[0]!;
    expect(after.workingCards).toEqual(after.originalCards);
    expect(isDirty(after)).toBe(false);
  });

  it('does not bump updatedAt', async () => {
    const id = await useDeckStore.getState().createDeck('D');
    await useDeckStore.getState().addCard('a', 1);
    await useDeckStore.getState().saveDeck(id);
    const savedAt = useDeckStore.getState().decks[0]!.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    await useDeckStore.getState().addCard('b', 1);
    await useDeckStore.getState().discardChanges(id);
    expect(useDeckStore.getState().decks[0]!.updatedAt).toBe(savedAt);
  });

  it('deep-clones originalCards so subsequent edits do not mutate the baseline', async () => {
    const id = await useDeckStore.getState().createDeck('D');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().addCard('b', 1);
    await useDeckStore.getState().discardChanges(id);
    // After discard, the new workingCards must be independent of originalCards
    await useDeckStore.getState().addCard('a', 1);
    const after = useDeckStore.getState().decks[0]!;
    expect(after.originalCards).toEqual([{ oracleId: 'a', count: 4 }]);
    expect(after.workingCards).toEqual([{ oracleId: 'a', count: 5 }]);
  });
});

describe('restoreRemoved', () => {
  it('re-adds an entry at its original count', async () => {
    const id = await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().removeCard('a', 4); // now in tray
    await useDeckStore.getState().restoreRemoved('a');
    const after = useDeckStore.getState().decks[0]!;
    expect(after.workingCards).toEqual([{ oracleId: 'a', count: 4 }]);
  });

  it('preserves the original name when present', async () => {
    const id = await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().addCard('a', 2, 'Lightning Bolt');
    await useDeckStore.getState().saveDeck(id);
    await useDeckStore.getState().removeCard('a', 2);
    await useDeckStore.getState().restoreRemoved('a');
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([
      { oracleId: 'a', count: 2, name: 'Lightning Bolt' },
    ]);
  });

  it('is a no-op when the card is still in working', async () => {
    await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().addCard('a', 4);
    await useDeckStore.getState().saveDeck(useDeckStore.getState().decks[0]!.id);
    await useDeckStore.getState().restoreRemoved('a'); // still there
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([{ oracleId: 'a', count: 4 }]);
  });

  it('is a no-op when the oracleId is not in originalCards', async () => {
    await useDeckStore.getState().createDeck('R');
    await useDeckStore.getState().restoreRemoved('ghost');
    expect(useDeckStore.getState().decks[0]!.workingCards).toEqual([]);
  });
});

describe('applyLandFill', () => {
  it('adds new basic lands when none exist', async () => {
    await useDeckStore.getState().createDeck('Test');
    await useDeckStore.getState().addCard('spell1', 22, 'Spell');
    const plan = {
      add: [{ oracleId: 'plains', count: 11 }, { oracleId: 'forest', count: 6 }],
      remove: [],
    };
    await useDeckStore.getState().applyLandFill(plan);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards.find((c) => c.oracleId === 'plains')?.count).toBe(11);
    expect(deck?.workingCards.find((c) => c.oracleId === 'forest')?.count).toBe(6);
    expect(deck?.workingCards.find((c) => c.oracleId === 'spell1')?.count).toBe(22);
  });

  it('removes existing basics when plan says so', async () => {
    await useDeckStore.getState().createDeck('Test');
    await useDeckStore.getState().addCard('plains', 15);
    const plan = {
      add: [],
      remove: [{ oracleId: 'plains', count: 6 }],
    };
    await useDeckStore.getState().applyLandFill(plan);
    const deck = useDeckStore.getState().decks[0];
    expect(deck?.workingCards.find((c) => c.oracleId === 'plains')?.count).toBe(9);
  });

  it('throws when no active deck', async () => {
    useDeckStore.setState({ activeDeckId: null });
    await expect(
      useDeckStore.getState().applyLandFill({ add: [], remove: [] }),
    ).rejects.toThrow();
  });

  it('persists to dexie', async () => {
    const id = await useDeckStore.getState().createDeck('Test');
    await useDeckStore.getState().applyLandFill({
      add: [{ oracleId: 'plains', count: 17 }],
      remove: [],
    });
    const persisted = await db.decks.get(id);
    expect(persisted?.workingCards.find((c) => c.oracleId === 'plains')?.count).toBe(17);
  });
});
