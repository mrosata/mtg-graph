// pipeline/rules/condition.cares_outlaws.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_outlaws';

describe('condition.cares_outlaws', () => {
  it.each([
    // Anthem/static "outlaws you control have/get X"
    ['during your turn, outlaws you control have first strike'],
    ['other outlaws you control have haste'],
    // "Whenever you cast an outlaw spell" — Double Down.
    ['whenever you cast an outlaw spell, copy that spell'],
    // "If an outlaw was sacrificed" — Boneyard Desecrator.
    ['if an outlaw was sacrificed this way, create a treasure token'],
    // Affinity for outlaws — Hellspur Brute.
    ['affinity for outlaws'],
    // "Each outlaw creature" / "another outlaw"
    ['deals 2 damage to each outlaw creature'],
    ['if you control another outlaw, create a treasure token'],
    // "Number of outlaws" scaling — Laughing Jasper Flint.
    ["the number of outlaws you control"],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Generic — no outlaw reference.
    ['draw a card'],
    ['create a 1/1 white knight creature token'],
    // Plain word "outlawed" / "out of law" — false-friend safety.
    ['the action was outlawed'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
