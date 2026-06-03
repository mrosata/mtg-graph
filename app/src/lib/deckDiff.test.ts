import { describe, it, expect } from 'vitest';
import { isDirty, added, removed } from './deckDiff';
import type { Deck } from './db';

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd', name: 'D', format: 'standard',
    originalCards: [], workingCards: [],
    createdAt: 0, updatedAt: 0,
    ...overrides,
  };
}

describe('isDirty', () => {
  it('is false when original and working are both empty', () => {
    expect(isDirty(makeDeck())).toBe(false);
  });

  it('is false when original and working have the same entries in the same order', () => {
    const cards = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }];
    expect(isDirty(makeDeck({ originalCards: cards, workingCards: cards }))).toBe(false);
  });

  it('is false when the same entries appear in a different order', () => {
    const a = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }];
    const b = [{ oracleId: 'b', count: 2 }, { oracleId: 'a', count: 4 }];
    expect(isDirty(makeDeck({ originalCards: a, workingCards: b }))).toBe(false);
  });

  it('is true when working has an extra entry', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 1 }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(true);
  });

  it('is true when working is missing an entry', () => {
    const orig = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 1 }];
    const work = [{ oracleId: 'a', count: 4 }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(true);
  });

  it('is true when the same oracleId has a different count', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 2 }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(true);
  });

  it('ignores entry name differences', () => {
    const orig = [{ oracleId: 'a', count: 4, name: 'Old' }];
    const work = [{ oracleId: 'a', count: 4, name: 'New' }];
    expect(isDirty(makeDeck({ originalCards: orig, workingCards: work }))).toBe(false);
  });

  it('is true when sideboard changes even if main is unchanged', () => {
    const main = [{ oracleId: 'a', count: 4 }];
    expect(isDirty(makeDeck({
      originalCards: main, workingCards: main,
      originalSideboardCards: [], sideboardCards: [{ oracleId: 'b', count: 2 }],
    }))).toBe(true);
  });

  it('is true when a sideboard entry changes count', () => {
    const sb = [{ oracleId: 'a', count: 2 }];
    const sbWork = [{ oracleId: 'a', count: 3 }];
    expect(isDirty(makeDeck({
      originalSideboardCards: sb, sideboardCards: sbWork,
    }))).toBe(true);
  });

  it('is false when neither main nor sideboard have changed', () => {
    const main = [{ oracleId: 'a', count: 4 }];
    const sb = [{ oracleId: 'b', count: 2 }];
    expect(isDirty(makeDeck({
      originalCards: main, workingCards: main,
      originalSideboardCards: sb, sideboardCards: sb,
    }))).toBe(false);
  });

  it('treats missing sideboard fields (pre-v5 shape) as empty, not dirty', () => {
    // No sideboard fields at all → both default to [] → not dirty.
    expect(isDirty(makeDeck())).toBe(false);
  });
});

describe('added', () => {
  it('returns nothing when working is a subset of original', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 2 }];
    expect(added(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([]);
  });

  it('returns working entries whose oracleId is not in original', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2, name: 'B' }];
    expect(added(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'b', count: 2, name: 'B' },
    ]);
  });

  it('does not include entries that only increased in count', () => {
    const orig = [{ oracleId: 'a', count: 2 }];
    const work = [{ oracleId: 'a', count: 4 }];
    expect(added(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([]);
  });
});

describe('removed', () => {
  it('returns nothing when working contains every original oracleId', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 1 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([]);
  });

  it('returns original entries missing from working', () => {
    const orig = [{ oracleId: 'a', count: 4, name: 'A' }, { oracleId: 'b', count: 2 }];
    const work = [{ oracleId: 'a', count: 4 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'b', count: 2 },
    ]);
  });

  it('returns the original count, not the working count', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work: Deck['workingCards'] = [];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'a', count: 4 },
    ]);
  });

  it('treats a working entry with count 0 as removed', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 0 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([
      { oracleId: 'a', count: 4 },
    ]);
  });

  it('does not include entries whose count decreased but is still > 0', () => {
    const orig = [{ oracleId: 'a', count: 4 }];
    const work = [{ oracleId: 'a', count: 1 }];
    expect(removed(makeDeck({ originalCards: orig, workingCards: work }))).toEqual([]);
  });
});
