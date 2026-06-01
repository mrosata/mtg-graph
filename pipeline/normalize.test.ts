import { describe, it, expect } from 'vitest';
import {
  stripReminderText,
  replaceSelfReferences,
  stripQuotedAbilities,
  normalizeOracleText,
  isIntrinsicKeyword,
} from './normalize';

describe('stripReminderText', () => {
  it('removes parenthetical reminder text', () => {
    expect(stripReminderText('Flying (This creature can\'t be blocked except by creatures with flying or reach.)'))
      .toBe('Flying');
  });

  it('preserves text with no parens', () => {
    expect(stripReminderText('Whenever a creature enters, draw a card.'))
      .toBe('Whenever a creature enters, draw a card.');
  });

  it('handles multiple parenthetical groups', () => {
    expect(stripReminderText('Trample (...) Flying (...)'))
      .toBe('Trample  Flying');
  });
});

describe('replaceSelfReferences', () => {
  it('replaces the card name with __SELF__', () => {
    expect(replaceSelfReferences('When Token Maker enters, create a token.', 'Token Maker'))
      .toBe('When __SELF__ enters, create a token.');
  });

  it('replaces ~ with __SELF__', () => {
    expect(replaceSelfReferences('When ~ enters, draw a card.', 'Whatever'))
      .toBe('When __SELF__ enters, draw a card.');
  });

  it('is case-insensitive on the name', () => {
    expect(replaceSelfReferences('TOKEN MAKER enters.', 'Token Maker'))
      .toBe('__SELF__ enters.');
  });

  it('replaces both faces of a DFC / Adventure card', () => {
    // "Front // Back" combined name — neither face references the combined name.
    expect(
      replaceSelfReferences(
        'When Frolicking Familiar enters, draw. Blow Off Steam deals 1 damage to any target.',
        'Frolicking Familiar // Blow Off Steam',
      ),
    ).toBe(
      'When __SELF__ enters, draw. __SELF__ deals 1 damage to any target.',
    );
  });

  it('replaces all three faces of an MDFC/triple split', () => {
    expect(
      replaceSelfReferences(
        'Alpha enters. Beta deals 1 damage. Gamma scries 2.',
        'Alpha // Beta // Gamma',
      ),
    ).toBe('__SELF__ enters. __SELF__ deals 1 damage. __SELF__ scries 2.');
  });

  it('replaces the longer face name first to avoid partial matches', () => {
    // Realistic prefix case: one face name is a prefix of another (no comma
    // splitting changes the segments). Without longest-first, "Aira" would
    // half-eat "Aira Stormsinger" before the longer form gets a chance.
    expect(
      replaceSelfReferences(
        'Aira Stormsinger casts. Aira flies.',
        'Aira // Aira Stormsinger',
      ),
    ).toBe('__SELF__ casts. __SELF__ flies.');
  });

  it('replaces the short legendary name (portion before the comma)', () => {
    // Greta pattern — oracle says "Greta" but full name is "Greta, Sweettooth Scourge".
    expect(
      replaceSelfReferences(
        'When Greta enters, create a Food token.',
        'Greta, Sweettooth Scourge',
      ),
    ).toBe('When __SELF__ enters, create a Food token.');
  });

  it('replaces both the short legendary name and the title portion', () => {
    expect(
      replaceSelfReferences(
        'Greta gets +1/+1. Sweettooth Scourge has trample.',
        'Greta, Sweettooth Scourge',
      ),
    ).toBe('__SELF__ gets +1/+1. __SELF__ has trample.');
  });

  it('replaces the short legendary name on " of "-style names (Sharae of Numbing Depths)', () => {
    // Regression: oracle text uses just "Sharae" but the full card name is
    // "Sharae of Numbing Depths". Same legendary short-name pattern as comma
    // names, but with " of " as the separator.
    expect(
      replaceSelfReferences(
        'When Sharae enters, tap target creature an opponent controls.',
        'Sharae of Numbing Depths',
      ),
    ).toBe('When __SELF__ enters, tap target creature an opponent controls.');
  });

  it('replaces the short legendary name on " the "-style names', () => {
    // Same pattern with " the " (e.g. "Ajani the Greathearted").
    expect(
      replaceSelfReferences(
        'Ajani gets +1.',
        'Ajani the Greathearted',
      ),
    ).toBe('__SELF__ gets +1.');
  });

  it('replaces the un-prefixed name for Alchemy "A-" rebalanced cards', () => {
    // Alchemy rebalances ("A-Geological Appraiser") inherit oracle text from
    // the original printing, so the text references the un-prefixed name.
    // Without stripping the "A-" prefix, self-name → __SELF__ silently misses.
    expect(
      replaceSelfReferences(
        'When Geological Appraiser enters, if you cast it, discover 3.',
        'A-Geological Appraiser',
      ),
    ).toBe('When __SELF__ enters, if you cast it, discover 3.');
  });

  it('non-Alchemy names without "A-" prefix behave unchanged', () => {
    // Regression: make sure the prefix-stripping path doesn't perturb the
    // common case.
    expect(
      replaceSelfReferences(
        'When Token Maker enters, create a token.',
        'Token Maker',
      ),
    ).toBe('When __SELF__ enters, create a token.');
  });

  // v0.23 — non-legendary cards must NOT apply the " of " / " the " short-name
  // split. Without the gate, "Pull from the Grave" yielded the segment
  // "Grave" which then ate the substring "graveyard" in oracle text,
  // rewriting it to "__SELF__yard" and blocking the
  // effect.return_from_graveyard_to_hand rule.
  it('does NOT split on " the " for non-legendary cards (Pull from the Grave)', () => {
    expect(
      replaceSelfReferences(
        'Return up to two target creature cards from your graveyard to your hand. You gain 2 life.',
        'Pull from the Grave',
        false,
      ),
    ).toBe('Return up to two target creature cards from your graveyard to your hand. You gain 2 life.');
  });

  it('does NOT split on " of " for non-legendary cards (Pawn of Ulamog)', () => {
    // "Pawn" would otherwise eat "Spawn" in the oracle text.
    expect(
      replaceSelfReferences(
        'When Pawn of Ulamog dies, create a 0/1 colorless Eldrazi Spawn creature token.',
        'Pawn of Ulamog',
        false,
      ),
    ).toBe('When __SELF__ dies, create a 0/1 colorless Eldrazi Spawn creature token.');
  });

  it('still splits on " the " for legendary cards (Ajani the Greathearted)', () => {
    expect(
      replaceSelfReferences(
        'Ajani gets +1.',
        'Ajani the Greathearted',
        true,
      ),
    ).toBe('__SELF__ gets +1.');
  });
});

describe('isIntrinsicKeyword', () => {
  it('matches a keyword on a standalone line', () => {
    expect(isIntrinsicKeyword('Flying\nWhenever this creature attacks, draw a card.', 'Flying')).toBe(true);
  });

  it('matches a keyword inside a comma-separated keyword block', () => {
    expect(isIntrinsicKeyword('Flying, lifelink, trample\nWhen this creature dies, gain 3 life.', 'Trample')).toBe(true);
    expect(isIntrinsicKeyword('Flying, lifelink, trample\nWhen this creature dies, gain 3 life.', 'Lifelink')).toBe(true);
  });

  it('rejects a keyword that only appears inside a granted clause', () => {
    // Goddric pattern — Flying is granted via Celebration, not intrinsic.
    const oracle = 'Haste\nCelebration — As long as two or more nonland permanents entered the battlefield under your control this turn, Goddric is a Dragon with base power and toughness 4/4, flying, and "{R}: Dragons you control get +1/+0 until end of turn."';
    expect(isIntrinsicKeyword(oracle, 'Flying')).toBe(false);
    expect(isIntrinsicKeyword(oracle, 'Haste')).toBe(true);
  });

  it('rejects a keyword that only appears inside an anthem grant', () => {
    const oracle = 'When this creature enters, creatures you control gain trample until end of turn.';
    expect(isIntrinsicKeyword(oracle, 'Trample')).toBe(false);
  });

  it('strips reminder text from keyword lines', () => {
    expect(isIntrinsicKeyword('Flying (This creature can\'t be blocked except by creatures with flying or reach.)', 'Flying')).toBe(true);
  });

  it('accepts keyword lines that include mana-cost tokens (Ward {N}, Equip {N})', () => {
    // Regression (Sleep-Cursed Faerie): "Flying, ward {2}" is a comma-joined
    // keyword line. The {N} suffix on Ward / Equip / Kicker keywords is a
    // mana-cost token, not prose. The line is still a keyword block.
    expect(isIntrinsicKeyword('Flying, ward {2}\nThis creature enters tapped.', 'Flying')).toBe(true);
    expect(isIntrinsicKeyword('Trample, ward {1}', 'Trample')).toBe(true);
  });

  it('handles multi-face cards (keyword on either face)', () => {
    const oracle = 'Flying\nWhenever you cast an instant or sorcery spell, this creature gets +1/+1.\n\nBlow Off Steam deals 1 damage to any target.';
    expect(isIntrinsicKeyword(oracle, 'Flying')).toBe(true);
  });

  // v0.14.15 — qualified keyword entry ("hexproof from X", "protection from X").
  // Niv-Mizzet, Guildpact: "Flying, hexproof from multicolored". Scryfall's
  // keywords array lists both 'Hexproof from' and 'Hexproof'; the rule check
  // needs to accept the qualified form on the keyword line.
  it('accepts "<keyword> from X" qualified entries', () => {
    expect(isIntrinsicKeyword('Flying, hexproof from multicolored', 'Hexproof')).toBe(true);
    expect(isIntrinsicKeyword('Hexproof from chosen player', 'Hexproof')).toBe(true);
  });
});

describe('stripQuotedAbilities', () => {
  it('strips text inside paired double quotes', () => {
    // Kitesail Larcenist's granted Treasure ability.
    expect(stripQuotedAbilities('the chosen permanents become Treasure artifacts with "{T}, Sacrifice this artifact: Add one mana of any color" and lose all other abilities.'))
      .toBe('the chosen permanents become Treasure artifacts with   and lose all other abilities.');
  });

  it('preserves apostrophes / contractions / possessives', () => {
    // Single quotes are NOT quote delimiters here.
    expect(stripQuotedAbilities("return target creature to its owner's hand"))
      .toBe("return target creature to its owner's hand");
    expect(stripQuotedAbilities("this creature can't attack or block"))
      .toBe("this creature can't attack or block");
  });

  it('handles multiple quoted clauses on the same card', () => {
    const before = 'creatures get "haste" and "trample".';
    expect(stripQuotedAbilities(before)).toBe('creatures get   and  .');
  });

  it('handles smart/curly double quotes', () => {
    expect(stripQuotedAbilities('tokens with “{T}: Add {G}.”'))
      .toBe('tokens with  ');
  });
});

describe('normalizeOracleText', () => {
  it('strips reminders, replaces self-refs, and lowercases', () => {
    const result = normalizeOracleText(
      'Flying (it can fly) When Token Maker enters, draw a card.',
      'Token Maker',
    );
    expect(result).toBe('flying  when __self__ enters, draw a card.');
  });

  it('collapses newlines so cross-line effects are reachable by sentence-anchored rules', () => {
    const result = normalizeOracleText(
      'This spell costs {1} less to cast for each creature that attacked this turn.\nDraw three cards.',
      'Rowdy Research',
    );
    expect(result).toBe(
      'this spell costs {1} less to cast for each creature that attacked this turn. draw three cards.',
    );
  });

  it('strips granted-ability text in double quotes from the host text (Kitesail Larcenist)', () => {
    const result = normalizeOracleText(
      'When this creature enters, the chosen permanents become Treasure artifacts with "{T}, Sacrifice this artifact: Add one mana of any color" and lose all other abilities.',
      'Kitesail Larcenist',
    );
    // Granted-ability text gone; host body intact.
    expect(result).not.toContain('{t}');
    expect(result).not.toContain('add one mana');
    expect(result).not.toContain('sacrifice this artifact');
    expect(result).toContain('become treasure artifacts');
  });
});
