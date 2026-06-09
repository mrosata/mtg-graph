import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { resolveMtgaCollection, resolveMtgaDecks } from './mtgaResolve';
import type { MtgaRawDeck } from './mtgaLogParser';

function mkCard(oracleId: string, printings: Array<{ set: string; cn: string; arenaId: number }>): Card {
  return {
    oracleId, name: oracleId, set: printings[0]!.set,
    printings: printings.map((p) => p.set),
    collectorNumber: printings[0]!.cn,
    manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: 'Creature', types: ['Creature'],
    subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '',
    printingDetails: printings.map((p) => ({ set: p.set, collectorNumber: p.cn, arenaId: p.arenaId })),
    tags: [],
  };
}

const sampleCards = (): Map<string, Card> => new Map([
  ['oid-a', mkCard('oid-a', [{ set: 'one', cn: '1', arenaId: 70001 }])],
  ['oid-b', mkCard('oid-b', [{ set: 'one', cn: '2', arenaId: 70002 }])],
  ['oid-bolt', mkCard('oid-bolt', [
    { set: 'm21', cn: '162', arenaId: 70100 },
    { set: 'fdn', cn: '500', arenaId: 80200 },
  ])],
]);

describe('resolveMtgaCollection', () => {
  it('aggregates counts by oracleId and records per-printing detail', () => {
    const raw = { '70001': 4, '70002': 2 };
    const { result, mtgaSummary } = resolveMtgaCollection(raw, sampleCards());

    expect(result.owned.get('oid-a')).toBe(4);
    expect(result.owned.get('oid-b')).toBe(2);
    expect(result.ownedDetail.get('oid-a')).toEqual([
      { set: 'one', collectorNumber: '1', count: 4 },
    ]);

    expect(mtgaSummary).toEqual({
      totalCardsOwned: 6,
      resolvedCardsOwned: 6,
      outOfPoolCount: 0,
      unresolvedArenaIds: [],
    });
  });

  it('sums two arena ids of the same oracle into one entry', () => {
    const raw = { '70100': 3, '80200': 1 };
    const { result } = resolveMtgaCollection(raw, sampleCards());
    expect(result.owned.get('oid-bolt')).toBe(4);
    const detail = result.ownedDetail.get('oid-bolt');
    expect(detail).toHaveLength(2);
    expect(detail).toContainEqual({ set: 'm21', collectorNumber: '162', count: 3 });
    expect(detail).toContainEqual({ set: 'fdn', collectorNumber: '500', count: 1 });
  });

  it('buckets unresolved arena ids into outOfPoolCount', () => {
    const raw = { '70001': 4, '99999': 7, '88888': 1 };
    const { result, mtgaSummary } = resolveMtgaCollection(raw, sampleCards());
    expect(result.owned.get('oid-a')).toBe(4);
    expect(result.owned.size).toBe(1);
    expect(mtgaSummary.outOfPoolCount).toBe(8);
    expect(mtgaSummary.unresolvedArenaIds).toHaveLength(2);
    expect(mtgaSummary.unresolvedArenaIds).toEqual(
      expect.arrayContaining([99999, 88888]),
    );
  });

  it('skips zero-count entries', () => {
    const raw = { '70001': 4, '70002': 0 };
    const { result, mtgaSummary } = resolveMtgaCollection(raw, sampleCards());
    expect(result.owned.get('oid-b')).toBeUndefined();
    expect(mtgaSummary.totalCardsOwned).toBe(4);
  });

  it('leaves unknownNames / unknownSets / unparseableLines empty', () => {
    const { result } = resolveMtgaCollection({ '70001': 1 }, sampleCards());
    expect(result.unknownNames).toEqual([]);
    expect(result.unknownSets).toEqual([]);
    expect(result.unparseableLines).toEqual([]);
  });
});

function mkRawDeck(over: Partial<MtgaRawDeck>): MtgaRawDeck {
  return {
    id: over.id ?? 'deck-x',
    name: over.name ?? 'Test',
    format: over.format ?? 'Standard',
    mainDeck: over.mainDeck ?? [],
    sideboard: over.sideboard ?? [],
    companion: over.companion ?? null,
  };
}

describe('resolveMtgaDecks', () => {
  it('resolves cards and computes in-pool percent', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({
        mainDeck: [{ id: 70001, quantity: 4 }, { id: 99999, quantity: 2 }],
        sideboard: [{ id: 70002, quantity: 1 }],
      })],
      sampleCards(),
    );
    expect(decks).toHaveLength(1);
    const d = decks[0]!;
    expect(d.mainboard).toEqual([{ oracleId: 'oid-a', count: 4 }]);
    expect(d.sideboard).toEqual([{ oracleId: 'oid-b', count: 1 }]);
    expect(d.unresolvedMain).toBe(2);
    expect(d.unresolvedSide).toBe(0);
    // 5 of 7 cards resolved.
    expect(d.inPoolPercent).toBe(Math.round((5 / 7) * 100));
  });

  it('resolves the companion when its arena_id is in pool', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({ mainDeck: [{ id: 70001, quantity: 4 }], companion: { id: 70002 } })],
      sampleCards(),
    );
    expect(decks[0]!.companion).toEqual({ oracleId: 'oid-b' });
  });

  it('drops the companion when its arena_id is unresolved', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({ mainDeck: [{ id: 70001, quantity: 4 }], companion: { id: 88888 } })],
      sampleCards(),
    );
    expect(decks[0]!.companion).toBeNull();
  });

  it('reports zero inPoolPercent on an empty deck (and avoids divide by zero)', () => {
    const decks = resolveMtgaDecks([mkRawDeck({})], sampleCards());
    expect(decks[0]!.inPoolPercent).toBe(0);
  });

  it('preserves the MTGA name / format / id fields verbatim', () => {
    const decks = resolveMtgaDecks(
      [mkRawDeck({ id: 'abc', name: 'My Brew', format: 'Historic' })],
      sampleCards(),
    );
    expect(decks[0]).toMatchObject({ mtgaId: 'abc', mtgaName: 'My Brew', mtgaFormat: 'Historic' });
  });
});
