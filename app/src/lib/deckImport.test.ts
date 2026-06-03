import { describe, it, expect } from 'vitest';
import { parseArenaDeck, parseDekDeck, parseDeck } from './deckImport';

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
    expect(r.sideboardEntries).toEqual([]);
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

  it('collects Sideboard rows as sideboardEntries (separate from main deck entries)', () => {
    const r = parseArenaDeck('Deck\n4 Forest\n\nSideboard\n2 Naturalize\n3 Veil of Summer');
    expect(r.entries).toEqual([{ count: 4, name: 'Forest' }]);
    expect(r.sideboardEntries).toEqual([
      { count: 2, name: 'Naturalize' },
      { count: 3, name: 'Veil of Summer' },
    ]);
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

const DEK_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>
<Deck>
  <NetDeckID>0</NetDeckID>
  <PreconstructedDeckID>0</PreconstructedDeckID>
  <Cards CatID="129247" Quantity="4" Sideboard="false" Name="Lightning Bolt" />
  <Cards CatID="129248" Quantity="2" Sideboard="false" Name="Swamp" />
  <Cards CatID="129249" Quantity="3" Sideboard="true" Name="Naturalize" />
</Deck>`;

describe('parseDekDeck', () => {
  it('parses Cards rows into entries with mtgoId from CatID', () => {
    const r = parseDekDeck(DEK_SAMPLE);
    expect(r.entries).toEqual([
      { count: 4, name: 'Lightning Bolt', mtgoId: 129247 },
      { count: 2, name: 'Swamp', mtgoId: 129248 },
    ]);
  });

  it('collects Sideboard="true" rows as sideboardEntries with mtgoId preserved', () => {
    const r = parseDekDeck(DEK_SAMPLE);
    expect(r.sideboardEntries).toEqual([
      { count: 3, name: 'Naturalize', mtgoId: 129249 },
    ]);
  });

  it('omits mtgoId when CatID is "0" (no MTGO printing available)', () => {
    const xml = `<?xml version="1.0"?><Deck><Cards CatID="0" Quantity="1" Sideboard="false" Name="Promo Card" /></Deck>`;
    const r = parseDekDeck(xml);
    expect(r.entries).toEqual([{ count: 1, name: 'Promo Card' }]);
  });

  it('omits mtgoId when CatID attribute is missing', () => {
    const xml = `<?xml version="1.0"?><Deck><Cards Quantity="1" Sideboard="false" Name="No ID" /></Deck>`;
    const r = parseDekDeck(xml);
    expect(r.entries).toEqual([{ count: 1, name: 'No ID' }]);
  });

  it('treats Sideboard="True" (mixed case) the same as "true"', () => {
    const xml = `<?xml version="1.0"?><Deck><Cards CatID="1" Quantity="2" Sideboard="True" Name="X" /></Deck>`;
    const r = parseDekDeck(xml);
    expect(r.entries).toEqual([]);
    expect(r.sideboardEntries).toEqual([{ count: 2, name: 'X', mtgoId: 1 }]);
  });

  it('returns null name (DEK has no deck name)', () => {
    const r = parseDekDeck(DEK_SAMPLE);
    expect(r.name).toBeNull();
  });

  it('captures Cards rows missing Name into unparseableLines', () => {
    const xml = `<?xml version="1.0"?><Deck><Cards CatID="1" Quantity="2" Sideboard="false" /></Deck>`;
    const r = parseDekDeck(xml);
    expect(r.entries).toEqual([]);
    expect(r.unparseableLines).toHaveLength(1);
  });

  it('throws on non-XML input (so the UI can show a clear error)', () => {
    expect(() => parseDekDeck('not xml at all')).toThrow();
  });
});

describe('parseDeck (sniffer)', () => {
  it('routes XML content to parseDekDeck', () => {
    const r = parseDeck(DEK_SAMPLE);
    expect(r.entries[0]).toEqual({ count: 4, name: 'Lightning Bolt', mtgoId: 129247 });
  });

  it('tolerates leading whitespace before the XML declaration', () => {
    const r = parseDeck('\n  ' + DEK_SAMPLE);
    expect(r.entries).toHaveLength(2);
  });

  it('routes Arena-format text to parseArenaDeck', () => {
    const r = parseDeck('Deck\n4 Lightning Bolt');
    expect(r.entries).toEqual([{ count: 4, name: 'Lightning Bolt' }]);
  });

  it('routes raw <Deck> XML (no <?xml prolog) to parseDekDeck', () => {
    const xml = `<Deck><Cards CatID="1" Quantity="2" Sideboard="false" Name="X" /></Deck>`;
    const r = parseDeck(xml);
    expect(r.entries).toEqual([{ count: 2, name: 'X', mtgoId: 1 }]);
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

  it('resolves sideboard entries the same way as main, surfacing unknowns separately', () => {
    const parsed = parseArenaDeck('Deck\nasdf\n4 Swamp\n\nSideboard\n2 Lightning Bolt\n3 Tarmogoyf');
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.sideboardResolved).toEqual([
      { oracleId: 'bolt-id', count: 2, name: 'Lightning Bolt' },
    ]);
    expect(r.sideboardUnknown).toEqual([{ count: 3, name: 'Tarmogoyf' }]);
    expect(r.unparseableLines).toEqual(['asdf']);
  });

  it('preserves mtgoId on sideboard resolved entries (DEK round-trip)', () => {
    const parsed = parseDekDeck(
      `<?xml version="1.0"?><Deck>` +
      `<Cards CatID="129248" Quantity="2" Sideboard="true" Name="Lightning Bolt" />` +
      `</Deck>`,
    );
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.sideboardResolved).toEqual([
      { oracleId: 'bolt-id', count: 2, name: 'Lightning Bolt', mtgoId: 129248 },
    ]);
  });

  it('preserves mtgoId from parsed entries into resolved entries', () => {
    const parsed = parseDekDeck(
      `<?xml version="1.0"?><Deck>` +
      `<Cards CatID="129247" Quantity="4" Sideboard="false" Name="Lightning Bolt" />` +
      `</Deck>`,
    );
    const r = resolveImport(parsed, FIXTURE_CARDS);
    expect(r.resolved).toEqual([
      { oracleId: 'bolt-id', count: 4, name: 'Lightning Bolt', mtgoId: 129247 },
    ]);
  });
});

import { deckToDekXml } from './deckExport';
import type { Deck } from './db';

describe('DEK end-to-end round-trip (parse → resolve → store → export → reparse)', () => {
  it('CatIDs survive the full import-then-export loop without loss', () => {
    const original = `<?xml version="1.0" encoding="utf-8"?>
<Deck>
  <Cards CatID="129247" Quantity="4" Sideboard="false" Name="Lightning Bolt" />
  <Cards CatID="129248" Quantity="2" Sideboard="false" Name="Swamp" />
</Deck>`;

    const parsed = parseDekDeck(original);
    const resolved = resolveImport(parsed, FIXTURE_CARDS);

    // Simulate what deckStore.importDeck does: build a Deck from resolved entries,
    // preserving mtgoId on DeckCard.
    const deck: Deck = {
      id: 'rt', name: 'Round Trip', format: 'standard',
      originalCards: resolved.resolved.map((e) => {
        const dc: { oracleId: string; count: number; name?: string; mtgoId?: number } =
          { oracleId: e.oracleId, count: e.count, name: e.name };
        if (e.mtgoId !== undefined) dc.mtgoId = e.mtgoId;
        return dc;
      }),
      workingCards: resolved.resolved.map((e) => {
        const dc: { oracleId: string; count: number; name?: string; mtgoId?: number } =
          { oracleId: e.oracleId, count: e.count, name: e.name };
        if (e.mtgoId !== undefined) dc.mtgoId = e.mtgoId;
        return dc;
      }),
      createdAt: 0, updatedAt: 0,
    };

    const emitted = deckToDekXml(deck, FIXTURE_CARDS);
    const reparsed = parseDekDeck(emitted);

    expect(reparsed.entries).toEqual([
      { count: 4, name: 'Lightning Bolt', mtgoId: 129247 },
      { count: 2, name: 'Swamp', mtgoId: 129248 },
    ]);
  });

  it('cards added in-app (no entry mtgoId) fall back to Card.mtgoId on export', () => {
    const FIXTURE_WITH_CANONICAL = new Map(FIXTURE_CARDS);
    FIXTURE_WITH_CANONICAL.set('bolt-id', {
      ...FIXTURE_CARDS.get('bolt-id')!,
      mtgoId: 555555,
    });

    const deck: Deck = {
      id: 'app', name: 'App-built', format: 'standard',
      originalCards: [{ oracleId: 'bolt-id', count: 4 }],
      workingCards: [{ oracleId: 'bolt-id', count: 4 }], // no mtgoId override
      createdAt: 0, updatedAt: 0,
    };

    const emitted = deckToDekXml(deck, FIXTURE_WITH_CANONICAL);
    const reparsed = parseDekDeck(emitted);
    expect(reparsed.entries[0]?.mtgoId).toBe(555555);
  });
});
