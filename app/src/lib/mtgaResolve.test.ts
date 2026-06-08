import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { resolveMtgaCollection } from './mtgaResolve';

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
