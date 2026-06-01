// pipeline/grant-extraction.test.ts
import { describe, it, expect } from 'vitest';
import { extractGrantedInnerTexts, normalizeInnerGrantText } from './grant-extraction';

describe('extractGrantedInnerTexts', () => {
  it.each([
    // Tale of Katara and Toph — anthem grant on creatures-you-control
    [
      'Creatures you control have "Whenever this creature becomes tapped for the first time during each of your turns, put a +1/+1 counter on it."',
      ['Whenever this creature becomes tapped for the first time during each of your turns, put a +1/+1 counter on it.'],
    ],
    // Citanul Hierophants — mana ability grant
    [
      'Creatures you control have "{T}: Add {G}."',
      ['{T}: Add {G}.'],
    ],
    // Galuf's Final Act — single-use targeted grant
    [
      'Until end of turn, target creature gets +1/+0 and gains "When this creature dies, put a number of +1/+1 counters equal to its power on up to one target creature."',
      ['When this creature dies, put a number of +1/+1 counters equal to its power on up to one target creature.'],
    ],
    // Great Divide Guide — multi-subject anthem
    [
      'Each land and Ally you control has "{T}: Add one mana of any color."',
      ['{T}: Add one mana of any color.'],
    ],
    // Root Manipulation — inner trigger inside an "and gain ... and" chain
    [
      'Until end of turn, creatures you control get +2/+2 and gain menace and "Whenever this creature attacks, you gain 1 life."',
      ['Whenever this creature attacks, you gain 1 life.'],
    ],
    // Multiple grants — Eirdu/Isilu shape (rare)
    [
      'Creatures you control have "When this creature dies, draw a card." Other creatures you control have "Whenever this creature attacks, you gain 1 life."',
      [
        'When this creature dies, draw a card.',
        'Whenever this creature attacks, you gain 1 life.',
      ],
    ],
    // Token-text "with" grant — "create a 2/2 Zombie creature token with '<inner>'"
    [
      'Create a 2/2 black Zombie creature token with "When this token dies, return it to the battlefield tapped."',
      ['When this token dies, return it to the battlefield tapped.'],
    ],
  ])('extracts grant-inner text from: %s', (oracleText, expected) => {
    expect(extractGrantedInnerTexts(oracleText)).toEqual(expected);
  });

  it.each([
    // Plain reminder text in parens — not a quoted grant
    'Trample (Whenever this creature deals combat damage, etc.)',
    // Naked quoted ability-word header — no host-grant frame
    '"Solved" is not a grant frame',
    // Plain prose, no quotes
    'When this creature enters, draw a card.',
    // Ability-name colon header without a quoted body
    'Particle Beam — When this creature enters, target creature gets -X/-X.',
  ])('returns empty for non-grant text: %s', (oracleText) => {
    expect(extractGrantedInnerTexts(oracleText)).toEqual([]);
  });

  it('handles curly quotes', () => {
    const text = 'Creatures you control have “Whenever this creature dies, draw a card.”';
    expect(extractGrantedInnerTexts(text)).toEqual(['Whenever this creature dies, draw a card.']);
  });
});

describe('normalizeInnerGrantText', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeInnerGrantText('When This Creature Dies,\nDraw a Card.'))
      .toBe('when this creature dies, draw a card.');
  });

  it('replaces ~ with __self__', () => {
    expect(normalizeInnerGrantText('~ enters tapped.'))
      .toBe('__self__ enters tapped.');
  });

  it('strips paren-wrapped reminder text', () => {
    // The grant inner might still carry parenthetical clarifications.
    expect(normalizeInnerGrantText('When this enters, draw a card. (Then discard if you have more than seven.)'))
      .toBe('when this enters, draw a card.');
  });
});
