import { describe, it, expect } from 'vitest';
import { rule } from './effect.explore';

describe('effect.explore', () => {
  it.each([
    // Amalia Benavides Aguirre — self-explore on lifegain trigger
    ['whenever you gain life, __self__ explores.'],
    // Cenote Scout, Kinjalli's Dawnrunner, Pathfinding Axejaw — generic "it explores"
    ['when this creature enters, it explores.'],
    // Miner's Guidewing — targeted explore
    ['when this creature dies, target creature you control explores.'],
    // Defossilize / Over the Edge — double explore on a target
    ['that creature explores, then it explores again.'],
    // Jadelight Spelunker — "explores X times"
    ['when this creature enters, it explores x times.'],
    // Twists and Turns — "would explore" replacement frame
    ['if a creature you control would explore, instead you scry 1, then that creature explores.'],
    // Seeker of Sunlight — activated self-explore
    ['{2}{g}: this creature explores.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Unrelated effects
    ['draw a card.'],
    ['scry 2, then draw a card.'],
    // 'discover' is the LCI cousin, not explore
    ['discover 3.'],
    // No explore verb in any form
    ['put a +1/+1 counter on target creature.'],
    // v0.14.1 — bare trigger-only frame. Merfolk Cave-Diver: card observes
    // explores via the trigger but doesn't cause exploring itself.
    ['whenever a creature you control explores, this creature gets +1/+0 until end of turn and can\'t be blocked this turn'],
    // Nicanzil — also trigger-only (two triggers, no effect-side explore).
    ['whenever a creature you control explores a land card, you may put a land card from your hand onto the battlefield tapped. whenever a creature you control explores a nonland card, put a +1/+1 counter on __self__'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
