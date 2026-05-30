import { describe, it, expect } from 'vitest';
import { rule } from './effect.tap';

describe('effect.tap', () => {
  it.each([
    ['tap target creature'],
    ['tap target permanent'],
    ['tap target artifact'],
    ['tap up to two target creatures'],
    ['tap target nonland permanent'],
    ['tap target nonbasic land'],
    // Regression (Succumb to the Cold): "one or two" quantifier without
    // "up to" — the adjective slot needs to fit "one or two target ".
    ['tap one or two target creatures an opponent controls'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['{t}: add {g}'],                                       // tap symbol (cost), not effect
    ["doesn't untap during your untap step"],               // steady-state property
    ['this creature enters tapped'],                        // ETB modifier
    ['draw a card'],                                        // unrelated
    ['destroy target creature'],                            // unrelated
    ['flying'],                                             // unrelated
    // Regression: Devouring Sugarmaw — "tap this creature" is a self-tap drawback
    // (cost or replacement), not a control/removal effect on another permanent.
    ['if you don\'t, tap this creature'],
    ['tap this creature: add one mana of any color'],
    ['tap __self__: draw a card'],
    ['tap this permanent and put a counter on it'],
    // Regression (Virtue of Strength): conditional "if you tap a basic land
    // for mana" is a mana-doubler modifier, not an imperative tap effect.
    ['if you tap a basic land for mana, it produces three times as much of that mana instead'],
    // Conditional "whenever you tap a land" — same shape, different conjunction.
    ['whenever you tap a land for mana, you gain 1 life'],
    // Regression (Adaptive Gemguard): activation-cost convoke-style "tap N untapped
    // artifacts and/or creatures you control: ..." is the COST, not the EFFECT.
    // effect.tap is for soft control/removal; costs that tap your own stuff don't belong.
    ['tap two untapped artifacts and/or creatures you control: put a +1/+1 counter on this creature. activate only as a sorcery.'],
    ['tap an untapped creature you control: scry 1'],
    // Regression (Guardian of the Great Door): "as an additional cost to cast
    // this spell, tap N untapped X you control" — that's a cost, not an
    // imperative tap effect. No colon to gate against, so we reject
    // bare-count "tap N untapped" via negative lookahead.
    ['as an additional cost to cast this spell, tap four untapped artifacts, creatures, and/or lands you control.'],
    // Regression (Caparocti Sunborn): "you may tap N untapped X" inside a
    // triggered ability with "if you do" rider is still a cost, not an
    // imperative tap of an opposing permanent.
    ['whenever __self__ attacks, you may tap two untapped artifacts and/or creatures you control. if you do, discover 3.'],
    // Regression (Fear of Exposure): same shape as Guardian, single-line cost.
    ['as an additional cost to cast this spell, tap two untapped creatures and/or lands you control.'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
