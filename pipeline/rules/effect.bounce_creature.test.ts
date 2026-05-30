import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_creature';

describe('effect.bounce_creature', () => {
  it.each([
    ['return target creature to its owner\'s hand'],
    ['return target attacking creature to your hand'],
    ['return up to two target creatures to their owners\' hands'],
    ['exile target creature, then return that creature to the battlefield under its owner\'s control'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    // v0.14.6 — delayed-trigger blink-back (Anzrag's Rampage): "return it to
    // your hand at the beginning of the next end step". The "it" antecedent
    // is the just-cheated-in creature; the spell's net effect is a creature
    // bounce that re-triggers ETB.
    ['you may put a creature card exiled this way onto the battlefield. it gains haste. return it to your hand at the beginning of the next end step'],
    // v0.14.9 — Regression (Hotshot Investigators): "up to one other target"
    // determiner. The "other" modifier excludes __SELF__ from valid targets;
    // semantically still a creature bounce.
    ["when this creature enters, return up to one other target creature to its owner's hand"],
    // v0.14.10 — Regression (Bramble Familiar // Fetch Quest, Fleeting Effigy):
    // self-bounce via "this creature" determiner. Both have an activated /
    // delayed-trigger ability that returns the card itself to its owner's
    // hand — semantically a bounce (re-triggers ETB on recast).
    ["{1}{g}, {t}, discard a card: return this creature to its owner's hand"],
    ["at the beginning of your end step, return this creature to its owner's hand"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target noncreature permanent to its owner\'s hand'],
    ['return target artifact to its owner\'s hand'],
    ['return target creature card from your graveyard'],
    ['destroy target creature'],
    // Regression (Neva, Stalked by Nightmares): "creature or enchantment card
    // from your graveyard to your hand" is graveyard recursion, not a bounce.
    ['return target creature or enchantment card from your graveyard to your hand'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion via PATTERN_BROAD, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
