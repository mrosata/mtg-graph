import { describe, it, expect } from 'vitest';
import { parseArenaDeck } from './deckImport';

const EXAMPLE_1 = `About
Name 4-Color Dinosaurs

Deck
5 Swamp
3 Mountain
4 Zombify
2 Blood Crypt
1 Temple of Malice
3 Gishath, Sun's Avatar
4 Bitter Triumph
4 Saheeli's Lattice
3 Trumpeting Carnosaur
4 Ghalta, Stampede Tyrant
4 Palani's Hatcher
1 Raucous Theater
4 Conduit Pylons
2 Vaultborn Tyrant
1 Blazemire Verge
1 Razortrap Gorge
4 Starting Town
4 Melded Moxite
4 Foggy Swamp Visions
2 Raph & Mikey, Troublemakers`;

describe('parseArenaDeck', () => {
  it('parses the canonical About + Deck format', () => {
    const r = parseArenaDeck(EXAMPLE_1);
    expect(r.name).toBe('4-Color Dinosaurs');
    expect(r.entries).toHaveLength(20);
    expect(r.entries[0]).toEqual({ count: 5, name: 'Swamp' });
    expect(r.entries[5]).toEqual({ count: 3, name: "Gishath, Sun's Avatar" });
    expect(r.entries[19]).toEqual({ count: 2, name: 'Raph & Mikey, Troublemakers' });
    expect(r.sideboardCount).toBe(0);
    expect(r.unparseableLines).toEqual([]);
  });

  it('returns null name when About is missing', () => {
    const r = parseArenaDeck('Deck\n4 Lightning Bolt');
    expect(r.name).toBeNull();
    expect(r.entries).toEqual([{ count: 4, name: 'Lightning Bolt' }]);
  });

  it('returns null name when About has no Name line', () => {
    const r = parseArenaDeck('About\nCommander Some Card\n\nDeck\n4 Lightning Bolt');
    expect(r.name).toBeNull();
    expect(r.entries).toHaveLength(1);
  });

  it('matches section headers case-insensitively', () => {
    const r = parseArenaDeck('ABOUT\nName Mixed Case\n\ndeck\n2 Island');
    expect(r.name).toBe('Mixed Case');
    expect(r.entries).toEqual([{ count: 2, name: 'Island' }]);
  });

  it('ignores // and # comment lines', () => {
    const r = parseArenaDeck('Deck\n// a comment\n# another\n3 Forest');
    expect(r.entries).toEqual([{ count: 3, name: 'Forest' }]);
    expect(r.unparseableLines).toEqual([]);
  });

  it('ignores unknown lines inside About (Commander, Companion)', () => {
    const r = parseArenaDeck(
      'About\nName N\nCommander Krenko, Tin Street Kingpin\nCompanion Lurrus\n\nDeck\n4 Mountain',
    );
    expect(r.name).toBe('N');
    expect(r.entries).toEqual([{ count: 4, name: 'Mountain' }]);
    expect(r.unparseableLines).toEqual([]);
  });

  it('sums Sideboard counts without adding to entries', () => {
    const r = parseArenaDeck('Deck\n4 Forest\n\nSideboard\n2 Naturalize\n3 Veil of Summer');
    expect(r.entries).toEqual([{ count: 4, name: 'Forest' }]);
    expect(r.sideboardCount).toBe(5);
  });

  it('captures garbled lines inside Deck in unparseableLines', () => {
    const r = parseArenaDeck('Deck\nasdf\n3\nfoo Lightning Bolt\n4 Forest');
    expect(r.entries).toEqual([{ count: 4, name: 'Forest' }]);
    expect(r.unparseableLines).toEqual(['asdf', '3', 'foo Lightning Bolt']);
  });

  it('tolerates Windows-style CRLF line endings', () => {
    const r = parseArenaDeck('About\r\nName CRLF\r\n\r\nDeck\r\n2 Plains\r\n');
    expect(r.name).toBe('CRLF');
    expect(r.entries).toEqual([{ count: 2, name: 'Plains' }]);
  });
});

import { resolveImport } from './deckImport';
import type { Card } from '@shared/types';

function makeCard(oracleId: string, name: string): Card {
  return {
    oracleId, name, set: 'tst', printings: ['tst'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags: [],
  };
}

const FIXTURE_CARDS = new Map<string, Card>([
  ['swamp-id', makeCard('swamp-id', 'Swamp')],
  ['bolt-id',  makeCard('bolt-id',  'Lightning Bolt')],
  ['dfc-id',   makeCard('dfc-id',   'Aquatic Alchemist // Bubble Up')],
]);

describe('resolveImport', () => {
  it('resolves an exact name (case-insensitive)', () => {
    const parsed = parseArenaDeck('Deck\n4 lightning bolt');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([{ oracleId: 'bolt-id', count: 4, name: 'Lightning Bolt' }]);
    expect(r.unknown).toEqual([]);
  });

  it('resolves a basic land', () => {
    const parsed = parseArenaDeck('Deck\n5 Swamp');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([{ oracleId: 'swamp-id', count: 5, name: 'Swamp' }]);
  });

  it('resolves a multi-face card given only the front-face name', () => {
    const parsed = parseArenaDeck('Deck\n2 Aquatic Alchemist');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([
      { oracleId: 'dfc-id', count: 2, name: 'Aquatic Alchemist // Bubble Up' },
    ]);
  });

  it('still resolves a multi-face card given the full "A // B" name', () => {
    const parsed = parseArenaDeck('Deck\n1 Aquatic Alchemist // Bubble Up');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved[0]?.oracleId).toBe('dfc-id');
  });

  it('routes truly unknown names into the unknown list', () => {
    const parsed = parseArenaDeck('Deck\n4 Tarmogoyf\n2 Lightning Bolt');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([{ oracleId: 'bolt-id', count: 2, name: 'Lightning Bolt' }]);
    expect(r.unknown).toEqual([{ count: 4, name: 'Tarmogoyf' }]);
  });

  it('passes sideboardCount and unparseableLines through unchanged', () => {
    const parsed = parseArenaDeck('Deck\nasdf\n4 Swamp\n\nSideboard\n2 Lightning Bolt');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.sideboardCount).toBe(2);
    expect(r.unparseableLines).toEqual(['asdf']);
  });
});
