import { describe, it, expect } from 'vitest';
import { buildShuffled } from './goldfish';
import type { Deck } from './db';

function deck(entries: { oracleId: string; count: number }[]): Deck {
  return {
    id: 'd', name: 'd', format: 'standard',
    originalCards: entries, workingCards: entries, createdAt: 0, updatedAt: 0,
  };
}

// Mulberry32 — small deterministic RNG for tests.
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('buildShuffled', () => {
  it('returns empty array for empty deck', () => {
    expect(buildShuffled(deck([]), Math.random)).toEqual([]);
  });

  it('produces every oracleId at the correct multiplicity', () => {
    const d = deck([
      { oracleId: 'a', count: 3 },
      { oracleId: 'b', count: 5 },
    ]);
    const result = buildShuffled(d, Math.random);
    expect(result.filter((x) => x === 'a').length).toBe(3);
    expect(result.filter((x) => x === 'b').length).toBe(5);
    expect(result.length).toBe(8);
  });

  it('seeded RNG produces deterministic output', () => {
    const d = deck([
      { oracleId: 'a', count: 2 },
      { oracleId: 'b', count: 2 },
      { oracleId: 'c', count: 2 },
    ]);
    const first = buildShuffled(d, seededRng(42));
    const second = buildShuffled(d, seededRng(42));
    expect(first).toEqual(second);
  });

  it('different seeds produce different orderings (probabilistically)', () => {
    const d = deck([
      { oracleId: 'a', count: 10 },
      { oracleId: 'b', count: 10 },
      { oracleId: 'c', count: 10 },
    ]);
    const first = buildShuffled(d, seededRng(1));
    const second = buildShuffled(d, seededRng(999));
    expect(first).not.toEqual(second);
  });
});
