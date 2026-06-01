// pipeline/rules/effect.partial_unblockable.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.partial_unblockable';

describe('effect.partial_unblockable', () => {
  it.each([
    // Power-gated partial unblock — recurring shape across multiple sets.
    // Cheeky House-Mouse / Squeak By, Stormkeld Vanguard, Verdant Outrider,
    // Cavern Stomper, Azure Beastbinder.
    ["it can't be blocked by creatures with power 3 or greater this turn"],
    ["this creature can't be blocked by creatures with power 2 or less"],
    ["this creature can't be blocked by creatures with power 2 or greater"],
    // "Except by N+ creatures" — menace-adjacent (Rampaging Ceratops:
    // "can't be blocked except by three or more creatures").
    ["this creature can't be blocked except by three or more creatures"],
    // "Except by <color/type>" — protection-adjacent partial.
    ["this creature can't be blocked except by elves"],
    // "By more than one creature" — Akawalli.
    ["can't be blocked by more than one creature"],
    // Pump-then-grant frame (Cheeky House-Mouse's adventure side).
    ["target creature you control gets +1/+1 until end of turn. it can't be blocked by creatures with power 3 or greater this turn"],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Full unblockability — handled by effect.unblockable, NOT this tag.
    ["this creature can't be blocked"],
    ["this creature can't be blocked this turn"],
    // Blocker-restriction gates (Delney-style) — different axis.
    ["creatures with power 3 or greater can't block"],
    // Phrasing about a different verb.
    ["this creature can't attack"],
    // Generic card text.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
