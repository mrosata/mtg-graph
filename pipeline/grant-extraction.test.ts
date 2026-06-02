// pipeline/grant-extraction.test.ts
import { describe, it, expect } from 'vitest';
import { extractGrantedInnerTexts, normalizeInnerGrantText } from './grant-extraction';
import { stripReminderText } from './normalize';

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

  describe('HIGH-3 reminder-token-grant leak (call site wraps with stripReminderText)', () => {
    // The call site in `pipeline/index.ts` must wrap raw oracle text in
    // `stripReminderText` before calling `extractGrantedInnerTexts`, so
    // that quoted ability bodies inside `(...)` reminder text for tokens
    // like Clue / Food / Mutavault / etc. are NOT extracted as anthem
    // grants on the host card.
    it.each([
      // Sold Out — Clue token reminder
      [
        "Exile target creature. If it was dealt damage this turn, create a Clue token. (It's an artifact with \"{2}, Sacrifice this token: Draw a card.\")",
      ],
      // Unlucky Cabbage Merchant — Food token reminder
      [
        "When this creature enters, create a Food token. (It's an artifact with \"{2}, {T}, Sacrifice this token: You gain 3 life.\")",
      ],
      // Zhao, the Moon Slayer — Mountain-conversion reminder
      [
        "As long as Zhao has a conqueror counter on him, nonbasic lands are Mountains. (They lose all other land types and abilities and have \"{T}: Add {R}.\")",
      ],
      // Mutable Explorer — Mutavault token reminder (two adjacent quoted clauses)
      [
        "When this creature enters, create a tapped Mutavault token. (It's a land with \"{T}: Add {C}\" and \"{1}: This token becomes a 2/2 creature with all creature types until end of turn. It's still a land.\")",
      ],
    ])('reminder-text quoted bodies are not extracted as grants: %s', (rawOracleText) => {
      // Without the strip, the inner quoted body leaks. With it, the
      // call site sees no grants.
      expect(extractGrantedInnerTexts(stripReminderText(rawOracleText))).toEqual([]);
    });

    // Negative check: legitimate `with "..."` token grants OUTSIDE the
    // reminder-text parens (e.g. Krenko-style token grants) still extract.
    it('still extracts legitimate token-grant bodies outside reminder parens', () => {
      const krenkoStyle =
        'Create a 2/2 black Zombie creature token with "When this token dies, return it to the battlefield tapped."';
      expect(extractGrantedInnerTexts(stripReminderText(krenkoStyle))).toEqual([
        'When this token dies, return it to the battlefield tapped.',
      ]);
    });

    // Negative check: anthem grant on creatures-you-control still extracts.
    it('still extracts anthem grants on creatures-you-control', () => {
      const anthem = 'Creatures you control have "Whenever this creature dies, draw a card."';
      expect(extractGrantedInnerTexts(stripReminderText(anthem))).toEqual([
        'Whenever this creature dies, draw a card.',
      ]);
    });
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
