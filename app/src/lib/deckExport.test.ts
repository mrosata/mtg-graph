import { describe, it, expect } from 'vitest';
import { deckToArenaText, deckToDekXml } from './deckExport';
import { parseDekDeck } from './deckImport';
import type { Card } from '@shared/types';
import type { Deck } from './db';

const cards = new Map<string, Card>([
  ['a', { oracleId: 'a', name: 'Lightning Bolt', set: 't', printings: ['t'], collectorNumber: '1', manaCost: '{R}', cmc: 1, colors: ['R'], colorIdentity: ['R'], typeLine: 'Instant', types: ['Instant'], subtypes: [], supertypes: [], oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [] }],
  ['b', { oracleId: 'b', name: 'Counterspell', set: 't', printings: ['t'], collectorNumber: '2', manaCost: '{U}{U}', cmc: 2, colors: ['U'], colorIdentity: ['U'], typeLine: 'Instant', types: ['Instant'], subtypes: [], supertypes: [], oracleText: '', keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '', tags: [] }],
  ['c', { oracleId: 'c', name: 'Aquatic Alchemist // Bubble Up', set: 't', printings: ['t'], collectorNumber: '3', manaCost: '{U}', cmc: 1, colors: ['U'], colorIdentity: ['U'], typeLine: 'Creature — Merfolk Wizard', types: ['Creature'], subtypes: ['Merfolk', 'Wizard'], supertypes: [], oracleText: '', keywords: [], power: '1', toughness: '1', rarity: 'common', imageUrl: '', tags: [] }],
]);

const ENTRIES = [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }];

const deck: Deck = {
  id: 'd', name: 'My Deck', format: 'standard',
  originalCards: ENTRIES.map((e) => ({ ...e })),
  workingCards: ENTRIES.map((e) => ({ ...e })),
  createdAt: 0, updatedAt: 0,
};

describe('deckToArenaText', () => {
  it('emits the canonical About/Deck format with card lines in insertion order', () => {
    expect(deckToArenaText(deck, cards)).toBe(
      'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n2 Counterspell',
    );
  });

  it('skips entries whose oracleId is not in the card index', () => {
    const d: Deck = { ...deck, workingCards: [...deck.workingCards, { oracleId: 'missing', count: 1 }] };
    expect(deckToArenaText(d, cards)).toBe(
      'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n2 Counterspell',
    );
  });

  it('emits multi-face cards with the full "Front // Back" name', () => {
    const d: Deck = { ...deck, name: 'DFC test', workingCards: [{ oracleId: 'c', count: 3 }] };
    expect(deckToArenaText(d, cards)).toBe(
      'About\nName DFC test\n\nDeck\n3 Aquatic Alchemist // Bubble Up',
    );
  });

  it('omits the trailing newline when the deck has no resolvable cards', () => {
    const empty: Deck = { ...deck, name: 'Empty', workingCards: [] };
    expect(deckToArenaText(empty, cards)).toBe('About\nName Empty\n\nDeck');
  });

  it('reads workingCards, not originalCards', () => {
    const d: Deck = {
      id: 'd', name: 'D', format: 'standard',
      originalCards: [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }],
      workingCards: [{ oracleId: 'a', count: 4 }], // 'b' removed in working
      createdAt: 0, updatedAt: 0,
    };
    const out = deckToArenaText(d, cards);
    expect(out).toContain('4 Lightning Bolt');
    expect(out).not.toContain('Counterspell');
  });

  it('appends a Sideboard section when sideboardCards has entries', () => {
    const d: Deck = {
      ...deck,
      sideboardCards: [
        { oracleId: 'b', count: 3 },
      ],
    };
    const out = deckToArenaText(d, cards);
    expect(out).toBe(
      'About\nName My Deck\n\nDeck\n4 Lightning Bolt\n2 Counterspell\n\nSideboard\n3 Counterspell',
    );
  });

  it('omits the Sideboard section when sideboardCards is empty or undefined', () => {
    expect(deckToArenaText(deck, cards)).not.toContain('Sideboard');
    expect(deckToArenaText({ ...deck, sideboardCards: [] }, cards)).not.toContain('Sideboard');
  });

  it('skips sideboard entries whose oracleId is not in the card index', () => {
    const d: Deck = {
      ...deck,
      sideboardCards: [{ oracleId: 'missing', count: 1 }, { oracleId: 'b', count: 2 }],
    };
    const out = deckToArenaText(d, cards);
    expect(out).toContain('Sideboard\n2 Counterspell');
    expect(out).not.toContain('missing');
  });
});

describe('deckToDekXml', () => {
  it('emits a valid DEK with a CatID, Quantity, Sideboard, and Name attribute per row', () => {
    const xml = deckToDekXml(deck, cards);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<Deck>');
    expect(xml).toContain('Name="Lightning Bolt"');
    expect(xml).toContain('Quantity="4"');
    expect(xml).toContain('Sideboard="false"');
  });

  it('prefers the entry-level mtgoId (the CatID the user imported)', () => {
    const d: Deck = {
      ...deck,
      workingCards: [{ oracleId: 'a', count: 4, mtgoId: 999999 }],
    };
    const cardsWithCanonical = new Map(cards);
    cardsWithCanonical.set('a', { ...cards.get('a')!, mtgoId: 111111 });
    const xml = deckToDekXml(d, cardsWithCanonical);
    expect(xml).toContain('CatID="999999"');
    expect(xml).not.toContain('CatID="111111"');
  });

  it('falls back to Card.mtgoId when the entry has no mtgoId override', () => {
    const cardsWithCanonical = new Map(cards);
    cardsWithCanonical.set('a', { ...cards.get('a')!, mtgoId: 111111 });
    const xml = deckToDekXml(deck, cardsWithCanonical);
    expect(xml).toContain('CatID="111111"');
  });

  it('falls back to CatID="0" when neither entry nor Card has an mtgoId', () => {
    const xml = deckToDekXml(deck, cards);
    expect(xml).toContain('CatID="0"');
  });

  it('skips entries whose oracleId is not in the card index', () => {
    const d: Deck = {
      ...deck,
      workingCards: [...deck.workingCards, { oracleId: 'missing', count: 1 }],
    };
    const xml = deckToDekXml(d, cards);
    expect(xml).not.toContain('missing');
  });

  it('reads workingCards, not originalCards', () => {
    const d: Deck = {
      ...deck,
      originalCards: [{ oracleId: 'a', count: 4 }, { oracleId: 'b', count: 2 }],
      workingCards: [{ oracleId: 'a', count: 4 }],
    };
    const xml = deckToDekXml(d, cards);
    expect(xml).toContain('Name="Lightning Bolt"');
    expect(xml).not.toContain('Counterspell');
  });

  it('escapes XML special chars in card names (apostrophes, ampersands)', () => {
    const apostropheCards = new Map<string, Card>([
      ['x', { ...cards.get('a')!, oracleId: 'x', name: "Gishath, Sun's Avatar" }],
      ['y', { ...cards.get('a')!, oracleId: 'y', name: 'Raph & Mikey, Troublemakers' }],
    ]);
    const d: Deck = {
      ...deck,
      workingCards: [{ oracleId: 'x', count: 1 }, { oracleId: 'y', count: 1 }],
    };
    const xml = deckToDekXml(d, apostropheCards);
    expect(xml).toContain('Sun&apos;s');
    expect(xml).toContain('Raph &amp; Mikey');
    // Round-trip back through DOMParser to confirm valid XML.
    const reparsed = parseDekDeck(xml);
    expect(reparsed.entries.map((e) => e.name)).toEqual([
      "Gishath, Sun's Avatar",
      'Raph & Mikey, Troublemakers',
    ]);
  });

  it('round-trips CatIDs through parseDekDeck without loss', () => {
    const d: Deck = {
      ...deck,
      workingCards: [
        { oracleId: 'a', count: 4, mtgoId: 129247 },
        { oracleId: 'b', count: 2, mtgoId: 129248 },
      ],
    };
    const xml = deckToDekXml(d, cards);
    const parsed = parseDekDeck(xml);
    expect(parsed.entries).toEqual([
      { count: 4, name: 'Lightning Bolt', mtgoId: 129247 },
      { count: 2, name: 'Counterspell', mtgoId: 129248 },
    ]);
  });

  it('emits sideboard rows with Sideboard="true" preserving the mtgoId fallback chain', () => {
    const d: Deck = {
      ...deck,
      sideboardCards: [{ oracleId: 'b', count: 3, mtgoId: 129249 }],
    };
    const xml = deckToDekXml(d, cards);
    expect(xml).toContain('Sideboard="true" Name="Counterspell"');
    expect(xml).toMatch(/CatID="129249"\s+Quantity="3"\s+Sideboard="true"/);
  });

  it('round-trips main + sideboard through parseDekDeck without loss', () => {
    const d: Deck = {
      ...deck,
      workingCards: [{ oracleId: 'a', count: 4, mtgoId: 129247 }],
      sideboardCards: [{ oracleId: 'b', count: 3, mtgoId: 129249 }],
    };
    const xml = deckToDekXml(d, cards);
    const parsed = parseDekDeck(xml);
    expect(parsed.entries).toEqual([
      { count: 4, name: 'Lightning Bolt', mtgoId: 129247 },
    ]);
    expect(parsed.sideboardEntries).toEqual([
      { count: 3, name: 'Counterspell', mtgoId: 129249 },
    ]);
  });
});
