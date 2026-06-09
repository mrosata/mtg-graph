import { describe, it, expect } from 'vitest';
import type { Card } from '@shared/types';
import { buildArenaIdIndex, type ArenaIdEntry } from './arenaIdIndex';

function mkCard(oracleId: string, printings: Array<{ set: string; cn: string; arenaId?: number }>): Card {
  return {
    oracleId, name: oracleId, set: printings[0]!.set, printings: printings.map((p) => p.set),
    collectorNumber: printings[0]!.cn, manaCost: null, cmc: 0,
    colors: [], colorIdentity: [], typeLine: 'Creature', types: ['Creature'],
    subtypes: [], supertypes: [], oracleText: '', keywords: [],
    power: null, toughness: null, rarity: 'common', imageUrl: '',
    printingDetails: printings.map((p) => {
      const d: { set: string; collectorNumber: string; arenaId?: number } = { set: p.set, collectorNumber: p.cn };
      if (p.arenaId !== undefined) d.arenaId = p.arenaId;
      return d;
    }),
    tags: [],
  };
}

describe('buildArenaIdIndex', () => {
  it('maps a single arena_id to its printing', () => {
    const cards = new Map<string, Card>([
      ['oid-a', mkCard('oid-a', [{ set: 'one', cn: '1', arenaId: 70001 }])],
    ]);
    const idx = buildArenaIdIndex(cards);
    expect(idx.get(70001)).toEqual<ArenaIdEntry>({ oracleId: 'oid-a', set: 'one', collectorNumber: '1' });
  });

  it('indexes every printing of a reprinted card', () => {
    const cards = new Map<string, Card>([
      ['oid-bolt', mkCard('oid-bolt', [
        { set: 'm21', cn: '162', arenaId: 70100 },
        { set: 'fdn', cn: '500', arenaId: 80200 },
      ])],
    ]);
    const idx = buildArenaIdIndex(cards);
    expect(idx.get(70100)?.set).toBe('m21');
    expect(idx.get(80200)?.set).toBe('fdn');
    expect(idx.get(80200)?.oracleId).toBe('oid-bolt');
  });

  it('skips printings without arenaId', () => {
    const cards = new Map<string, Card>([
      ['oid-paper', mkCard('oid-paper', [{ set: 'old', cn: '1' }])],
    ]);
    const idx = buildArenaIdIndex(cards);
    expect(idx.size).toBe(0);
  });
});
