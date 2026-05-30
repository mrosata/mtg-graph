import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_permanent';

describe('effect.sacrifice_permanent (parent, universal-only)', () => {
  it.each([
    ['sacrifice a permanent'],
    ['sacrifice another permanent'],
    ['sacrifice target permanent'],
    ['sacrifice three permanents'],
    ['sacrifice a nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
    ['sacrifice a creature'],
    ['sacrifice an artifact'],
    ['sacrifice an enchantment'],
    ['sacrifice a land'],
    ['destroy target permanent'],
    // v0.14.1 — edict leak. "Each opponent sacrifices a nonland permanent"
    // (Throne of the Grim Captain) is an edict, not a controller-side sac.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito observes sacs, doesn't do them.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
