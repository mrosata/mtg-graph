import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_land';

describe('effect.sacrifice_land', () => {
  it.each([
    ['sacrifice a land'],
    ['sacrifice another land'],
    ['sacrifice target land'],
    ['sacrifice two lands'],
    ['as an additional cost to cast this spell, sacrifice a land'],
    ['sacrifice a permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonland permanent'],
    ['sacrifice a creature'],
    ['destroy target land'],
    // v0.14.1 — aristocrats trigger leak. Vito: "whenever you sacrifice
    // another permanent" — this card observes sacs, doesn't perform them.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
