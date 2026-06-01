import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_warped';

describe('condition.cares_warped', () => {
  it.each([
    // Hymn of the Faller (and the rest of the Void cycle)
    ['void — if a nonland permanent left the battlefield this turn or a spell was warped this turn, draw another card.'],
    // Close Encounter
    ['as an additional cost to cast this spell, choose a creature you control or a warped creature card you own in exile.'],
    // Blade of the Swarm
    ['put target exiled card with warp on the bottom of its owner\'s library.'],
    // Full Bore
    ['if that creature was cast for its warp cost, it also gains trample and haste until end of turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Bare warp keyword line (effect.has_warp territory; cares_warped should NOT fire)
    ['warp {1}{w}'],
    // Unrelated
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
