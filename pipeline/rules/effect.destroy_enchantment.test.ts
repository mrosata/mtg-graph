import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_enchantment';

describe('effect.destroy_enchantment', () => {
  it.each([
    ['destroy target enchantment'],
    ['destroy all enchantments'],
    ['destroy target enchantment or artifact'],
    ['destroy target artifact or enchantment'],
    ['destroy each enchantment you don\'t control'],
    ['destroy target permanent'],
    ['destroy target nonland permanent'],
    ['destroy target noncreature permanent'],
    // v0.14.1 — Molten Collapse two-comma chain.
    ['destroy target noncreature, nonland permanent with mana value 1 or less'],
    // v0.20.0 — enchantment-subtype-named destroy (Anthropede: "destroy
    // target Room"). Rooms (and Auras / Sagas / Classes / Curses / Shrines /
    // Backgrounds) are enchantment subtypes — destroying them removes an
    // enchantment.
    ['reach when this creature enters, you may discard a card or pay {2}. when you do, destroy target room.'],
    ['destroy target aura'],
    ['destroy target saga'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['destroy target nonenchantment permanent'],
    ['destroy target creature'],
    ['destroy target artifact'],
    ['exile target enchantment'],
    ['return target enchantment to its owner\'s hand'],
    ['enchanted creature gets +1/+1'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression (Urgent Necropsy): Vindicate-style multi-target chain. The
  // PATTERN_OWN filler quantifier ({0,6}) can't span past two prior
  // "up to one target X," segments. A chained pattern anchored on a leading
  // `destroy` verb plus a later `target enchantment` within the same
  // sentence catches the missed case.
  it.each([
    ['destroy up to one target artifact, up to one target creature, up to one target enchantment, and up to one target planeswalker.'],
    ['destroy target artifact and target enchantment.'],
  ])('matches chained multi-target destroy: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });
});
