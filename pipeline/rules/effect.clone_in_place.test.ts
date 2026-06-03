import { describe, it, expect } from 'vitest';
import { rule } from './effect.clone_in_place';

describe('effect.clone_in_place', () => {
  it.each([
    // Deepfathom Echo
    ['you may have it become a copy of another creature you control until end of turn.'],
    // Generic becomes-a-copy of permanent
    ['__self__ becomes a copy of target creature.'],
    // Becomes a copy of any permanent
    ['target permanent becomes a copy of another permanent of your choice.'],
    // Mockingbird-style ETB-as-copy
    ['you may have this creature enter as a copy of any creature on the battlefield.'],
    // Echoing Deeps — "enter tapped as a copy of"
    ['you may have this land enter tapped as a copy of any land card in a graveyard.'],
    // Regression (Fleeting Reflection): "up to one other target creature" is
    // 5 filler words between `becomes a copy of` and `creature`, exceeding
    // the old {0,3} quantifier. Modern targeting templating uses this form
    // (Magnetic Whirlpool, Memory Plunder, Fleeting Reflection).
    ['target creature you control gains hexproof until end of turn. untap that creature. until end of turn, it becomes a copy of up to one other target creature.'],
    ['it becomes a copy of up to one other target nonlegendary creature.'],
    // Regression (Lazav, Familiar Stranger): "you may have __self__ become a
    // copy of that card" — anaphoric `that card` referent (binds to an
    // earlier `if a creature card was exiled this way` conditional). The
    // existing noun alternation (creature|permanent|artifact|...|it) didn't
    // include the bare-noun `card`, but "that card" is a standard clone
    // referent in the Lazav / exile-and-copy family.
    ['if a creature card was exiled this way, you may have __self__ become a copy of that card until end of turn.'],
    ['you may have __self__ become a copy of that card'],
    ['__self__ becomes a copy of that card'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Token-creating copy — handled by effect.copy_permanent_token
    ['create a token that is a copy of target creature.'],
    // Spell copy — handled by effect.copy_spell
    ['copy target instant or sorcery spell.'],
    // Plain ETB (no copy)
    ['__self__ enters the battlefield tapped.'],
    // Plain token creation (no copy)
    ['create a 1/1 white spirit creature token.'],
    // Unrelated
    ['draw a card.'],
    // v0.35.0 — Batch 3: Choreographed Sparks FP. "Copy target creature spell"
    // is effect.copy_spell territory; the "spell" disambiguator means the
    // permanent-on-battlefield clone semantic doesn't apply. Add negative
    // lookahead `(?! spell)` after the type noun.
    ['copy target creature spell you control. the copy gains haste.'],
    ['copy target creature spell.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
