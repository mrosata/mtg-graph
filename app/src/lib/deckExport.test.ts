import { describe, it, expect } from 'vitest';
import { deckToArenaText } from './deckExport';
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
});
