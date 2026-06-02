import { describe, it, expect } from 'vitest';
import { rule } from './effect.prevent_lifegain';

describe('effect.prevent_lifegain', () => {
  it.each([
    // Giant Cindermaw, Rampaging Ferocidon, Everlasting Torment, Sunspine Lynx.
    ["players can't gain life"],
    // The Lord of Pain.
    ["your opponents can't gain life"],
    // Grievous Wound.
    ["enchanted player can't gain life"],
    // Screaming Nemesis — game-long, target-scoped.
    ["if a player is dealt damage this way, they can't gain life for the rest of the game"],
    // Tainted Remedy substitution form (canonical anti-lifegain spell).
    ['if an opponent would gain life, that player loses that much life instead'],
    // Targeted-opponent variant.
    ["target opponent can't gain life this turn"],
    // Each-opponent variant.
    ["each opponent can't gain life"],
    // HIGH-14 (Mornsong Aria): disjunctive "can't draw cards or gain life".
    ["players can't draw cards or gain life"],
    ["your opponents can't sacrifice creatures or gain life"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Opposite direction — gaining life.
    ['you gain 1 life'],
    ['target player gains 5 life'],
    // Alt-win lock (different axis: effect.cant_lose).
    ["you can't lose the game"],
    // Blocker restriction — unrelated.
    ["creatures can't be blocked"],
    // Plain damage frame.
    ['this creature deals 3 damage to any target'],
    // Cares-about-lifegain (different axis).
    ['whenever you gain life, draw a card'],
    // Unrelated.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
