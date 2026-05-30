import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_planeswalker';

describe('effect.sacrifice_planeswalker', () => {
  it.each([
    ['sacrifice a planeswalker'],
    ['sacrifice another planeswalker'],
    ['sacrifice target planeswalker'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonplaneswalker permanent'],
    ['sacrifice a creature'],
    ['destroy target planeswalker'],
    // v0.14.1 — edict leak. Throne of the Grim Captain: "each opponent
    // sacrifices a nonland permanent" — edict, not a controller-side sac.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
