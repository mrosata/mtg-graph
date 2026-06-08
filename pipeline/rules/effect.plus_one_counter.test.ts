import { describe, it, expect } from 'vitest';
import { rule } from './effect.plus_one_counter';

describe('effect.plus_one_counter', () => {
  it.each([
    ['put a +1/+1 counter on target creature'],
    ['put two +1/+1 counters on each creature you control'],
    ['put a +1/+1 counter on it'],
    ['puts a +1/+1 counter on each creature'],
    ['put x +1/+1 counters on target creature'],
    ['put up to two +1/+1 counters on target creature'],
    ['__self__ enters with a +1/+1 counter on it'],
    ['this creature enters with a +1/+1 counter on it if an opponent lost life this turn'],
    ['enters the battlefield with a +1/+1 counter on it'],
    ['return it to the battlefield under its owner\'s control with a +1/+1 counter on it'],
    ['double the number of +1/+1 counters on it'],
    // "distribute" is the multi-target variant of "put"
    ['distribute x +1/+1 counters among any number of target creatures you control'],
    ['distribute three +1/+1 counters among one, two, or three target creatures'],
    ['distribute two +1/+1 counters among one or two target creatures you control'],
    // Variable-count framings (Gruff Triplets)
    ['put a number of +1/+1 counters equal to its power on each creature you control'],
    ['put a number of +1/+1 counters on target creature equal to the number of lands you control'],
    // Regression (The Goose Mother): variable-amount ETB-with — quantifier is
    // the letter X. The "put" arm already lists `x`; the ETB-with sister did
    // not.
    ['__self__ enters with x +1/+1 counters on it'],
    // v0.12.9 — reanimation-with-counters frame (Abuelo's Awakening).
    // "Return … with X additional +1/+1 counters on it" or "with N additional".
    ['return target artifact or non-aura enchantment card from your graveyard to the battlefield with x additional +1/+1 counters on it'],
    ['return target creature card from your graveyard to the battlefield with two additional +1/+1 counters on it'],
    // Gev, Scaled Scorch — Hardened Scales-style ETB modifier "with an
    // additional +1/+1 counter". The "additional" qualifier between the
    // determiner and "+1/+1" was previously only accepted in the reanimate
    // (return-with) arm.
    ['other creatures you control enter with an additional +1/+1 counter on them for each opponent who lost life this turn'],
    ['this creature enters with an additional +1/+1 counter on it'],
    // v0.24 — DSK keyword-counter family: "+1/+1 counter and a <X> counter"
    // tail. The "on <target>" anchor needs to admit a second counter clause
    // between the count and the anchor.
    // Champion of Dusan
    ['put a +1/+1 counter and a trample counter on target creature'],
    // Kheru Goldkeeper
    ['put two +1/+1 counters and a flying counter on target creature you control'],
    // Plural-second-counter form
    ['put a +1/+1 counter and two hexproof counters on target creature'],
    // 2026-06-01 audit Group 17 — Caradora, Heart of Alacria: Hardened-Scales
    // replacement effect. "If one or more +1/+1 counters would be put on
    // <subject>, that many plus one +1/+1 counters are put on it instead".
    // Semantically a counter-adder.
    ['if one or more +1/+1 counters would be put on a creature or vehicle you control, that many plus one +1/+1 counters are put on it instead'],
    // Branching Evolution-style frame
    ['if one or more +1/+1 counters would be put on a creature you control, twice that many +1/+1 counters are put on it instead'],
    // v0.35.0 — Batch 13: move-counter frame (Tester of the Tangential).
    // "Move N +1/+1 counters from <source> onto <target>" — target-side
    // counter addition fits the plus_one_counter axis.
    ['when you do, move x +1/+1 counters from this creature onto another target creature.'],
    // v0.38.0 — Batch 6: move-counter arm admits `any number of`.
    // Aetherborn Marauder: "move any number of +1/+1 counters from other
    // permanents you control onto this creature".
    ['when this creature enters, move any number of +1/+1 counters from other permanents you control onto this creature.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['if it has a +1/+1 counter on it'],
    ['whenever a creature you control with a +1/+1 counter on it attacks'],
    ['as long as __self__ has a +1/+1 counter'],
    ['__self__ deals 2 damage to any target'],
    ['draw a card'],
    ['put a charge counter on target artifact'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
