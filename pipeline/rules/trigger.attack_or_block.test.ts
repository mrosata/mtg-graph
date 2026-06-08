// pipeline/rules/trigger.attack_or_block.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.attack_or_block';

describe('trigger.attack_or_block', () => {
  it.each([
    ['whenever __self__ attacks'],
    ['whenever a creature you control blocks'],
    // v0.39.0 — 200-card audit Ship 13 — Angelic Sell-Sword. Evidence-window
    // tightening: the rule still fires on the inner "whenever this creature
    // attacks" trigger but the captured evidence span no longer spills
    // across adjacent commas / ETB clauses. No graph impact — cosmetic only.
    ['whenever this creature or another nontoken creature you control enters, create a 1/1 red mercenary creature token with whenever this creature attacks, if its power is 6 or greater, draw a card.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  // v0.39.0 — evidence span should be the tight "whenever this creature attacks"
  // arm, not a multi-clause span starting at the first "whenever".
  it('evidence stays tight, no comma-spill (Angelic Sell-Sword)', () => {
    const text = 'whenever this creature or another nontoken creature you control enters, create a 1/1 red mercenary creature token with whenever this creature attacks, if its power is 6 or greater, draw a card.';
    const result = rule.match(text);
    expect(result).toBeTruthy();
    if (result) {
      // Tight evidence should not contain a comma — filler is `[^,.]{0,80}?`.
      expect((result as { evidence: string }).evidence.includes(',')).toBe(false);
    }
  });

  it.each([
    ['all creatures attack if able'],
    // Regression: Experimental Confectioner — "can't block" inside a token's
    // quoted oracle text must not register as an attack/block trigger.
    ['whenever you sacrifice a food, create a 1/1 black rat creature token with "this token can\'t block."'],
    ['this creature can\'t attack or block'],
    ['creatures you control can\'t be blocked'],
    // Regression (Contested Game Ball): participles inside noun phrases
    // ("the attacking player", "the blocking creature") aren't triggers.
    ["whenever you're dealt combat damage, the attacking player gains control of this artifact and untaps it."],
    ["whenever a creature deals combat damage, the blocking player loses 1 life."],
    // v0.22.0 — Stalked Researcher: "this creature can attack this turn as
    // though it didn't have defender". Static permission inside a triggered
    // ability body — not a trigger on attacking. The `can` modal must join
    // the existing negative-lookbehind alternation.
    ["defender eerie — whenever an enchantment you control enters and whenever you fully unlock a room, this creature can attack this turn as though it didn't have defender."],
    ['whenever you cast a spell, this creature can attack this turn.'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
