import { describe, it, expect } from 'vitest';
import { rule } from './effect.destroy_creature';

describe('effect.destroy_creature', () => {
  it.each([
    // Own-type cases
    ['destroy target creature'],
    ['destroy target tapped creature'],
    ['destroy all creatures'],
    ['destroy each creature with flying'],
    ['destroy up to two target creatures'],
    // Type-inclusive broad cases (creature is included)
    ['destroy target permanent'],
    ['destroy all permanents'],
    ['destroy target nonland permanent'],
    ['destroy each nontoken permanent'],
    // v0.12.9 — pronoun back-reference: "destroy that creature instead"
    // (Kellan's Lightblades). The "that creature" antecedent is the target
    // already named in the same effect ("3 damage to target attacking or
    // blocking creature").
    ['__self__ deals 3 damage to target attacking or blocking creature. if this spell was bargained, destroy that creature instead'],
    ['destroy that creature'],
    // v0.20.0 — antecedent-anchored "destroy it" (Cracked Skull aura).
    // Sentence-bounded; bare "destroy it" still excluded.
    ['enchant creature when this aura enters, look at target player\'s hand. you may choose a nonland card from it. that player discards that card. when enchanted creature is dealt damage, destroy it.'],
    // v0.20.0 — "target creature ... . destroy it" sentence-bounded
    // antecedent shape.
    ['target creature gets -2/-2 until end of turn. destroy it.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // noncreature explicitly excludes creature
    ['destroy target noncreature permanent'],
    ['destroy each noncreature, nontoken permanent'],
    // Wrong verb
    ['exile target creature'],
    ['return target creature to its owner\'s hand'],
    // No verb / unrelated
    ['target creature gets -3/-3 until end of turn'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
