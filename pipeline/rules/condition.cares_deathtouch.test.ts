import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_deathtouch';

describe('condition.cares_deathtouch', () => {
  it.each([
    ['creatures with deathtouch you control get +1/+1'],
    ['creature with deathtouch'],
    ['creatures you control with deathtouch have menace'],
    ['target creature with deathtouch'],
    ['whenever a creature with deathtouch deals combat damage, draw a card'],
    ['with deathtouch'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['deathtouch'],                                          // self-keyword only — that's effect.has_deathtouch
    ['target creature gains deathtouch until end of turn'],  // grants, not cares
    ['draw a card'],
    ['flying'],
    ['creatures with flying'],                               // wrong keyword
    // v0.14.1 — manland self-animation should NOT fire cares_deathtouch.
    // The "creature with deathtouch" appears inside a "becomes a [...]"
    // animation clause (Restless Reef), not as a payoff group reference.
    ['{2}{u}{b}: until end of turn, this land becomes a 4/4 blue and black shark creature with deathtouch. it\'s still a land.'],
    // v0.14.6 — Case-style self-animation (Case of the Gorgon's Kiss).
    // "Solved — This Case IS a 4/4 Gorgon creature with deathtouch" — same
    // self-animation pattern as manlands but with "is a" instead of "becomes
    // a" (the Case's solved state grants intrinsic creature type and kw).
    ['solved — this case is a 4/4 gorgon creature with deathtouch and lifelink in addition to its other types.'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
