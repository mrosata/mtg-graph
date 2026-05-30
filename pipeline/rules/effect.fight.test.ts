// pipeline/rules/effect.fight.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.fight';

describe('effect.fight', () => {
  it.each([
    // Affectionate Indrik shape
    ['when this creature enters, you may have it fight target creature you don\'t control.'],
    // Brigid's Command / Plow Through / Bushwhack
    ['target creature you control fights target creature an opponent controls.'],
    // Curse of the Werefox / Pitiless Fists
    ['that creature fights up to one target creature you don\'t control.'],
    ['enchanted creature fights up to one target creature an opponent controls.'],
    // Longstalk Brawl / Malamet Battle Glyph
    ['choose target creature you control and target creature you don\'t control. then those creatures fight each other.'],
    // Faunsbane Troll
    ['this creature fights target creature you don\'t control.'],
    // Graceful Takedown — fight-shaped via "each deal damage equal to their power to target creature"
    ['any number of target enchanted creatures you control and up to one other target creature you control each deal damage equal to their power to target creature you don\'t control.'],
    // Primal Might
    ['target creature you control gets +x/+x until end of turn. then it fights up to one target creature you don\'t control.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // "Fight" as a noun / unrelated wording
    ['this spell can\'t be countered by fight effects'],
    // No fight at all
    ['target creature deals 3 damage to any target.'],
    // "Fight Crime" choice mode (School Daze) — not a creature fighting
    ['• fight crime — counter target spell. draw a card.'],
    // Mere mention of damage doesn't fire (board wipe)
    ['this creature deals 2 damage to each creature.'],
    // Reanimate text mentions creature but no fight
    ['return target creature card from your graveyard to the battlefield.'],
    // Regression (Dire Flail): "this creature deals damage equal to its power
    // to target creature" — single-source single-target, not a fight.
    ['equipped creature gets +3/+0 and has "whenever this creature attacks, you may sacrifice an artifact other than __self__. when you do, this creature deals damage equal to its power to target creature."'],
    // Regression (Itzquinth, Firstborn of Gishath): "target dinosaur you
    // control deals damage equal to its power to another target creature" —
    // single-source single-target. Fight requires plural/anthem-style subject.
    ['when __self__ enters, you may pay {2}. when you do, target dinosaur you control deals damage equal to its power to another target creature.'],
    // v0.14.7 — Regression (Hard-Hitting Question). One-sided pump-and-poke:
    // "target creature you control deals damage equal to its power to target
    // creature or planeswalker you don't control." Singular verb ("deals"),
    // singular pronoun ("its"), no reciprocal damage — this is Prey Upon-
    // shaped removal, not a fight. The "or planeswalker" target also
    // disqualifies it as a fight at the rules level.
    ['target creature you control deals damage equal to its power to target creature or planeswalker you don\'t control.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
