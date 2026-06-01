// pipeline/rules/trigger.beginning_of_end_step.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.beginning_of_end_step';

describe('trigger.beginning_of_end_step', () => {
  it.each([
    // Eriette of the Charmed Apple
    ['at the beginning of your end step, each opponent loses x life and you gain x life'],
    // Each-end-step variant
    ['at the beginning of each end step, draw a card'],
    // Opponent's end step
    ["at the beginning of each opponent's end step, this creature deals 1 damage to that player"],
    // Token-create variant
    ['at the beginning of your end step, create a 1/1 white spirit creature token with flying'],
    // Multi-target end step
    ['at the beginning of your end step, if you control three or more artifacts, draw a card'],
    // v0.14.6 — delayed-trigger frame (Anzrag's Rampage): "at the beginning
    // of the next end step" creates a one-shot delayed trigger from a spell.
    // Still the same axis — it triggers at end of an end step.
    ['return it to your hand at the beginning of the next end step'],
    ['exile it at the beginning of the next end step'],
    // v0.14.9 — Regression (Harried Dronesmith): "your next end step" delayed-
    // trigger frame. Combat-trigger spells / Thopter creators commonly use
    // "Sacrifice it at the beginning of your next end step" idiom.
    ['sacrifice it at the beginning of your next end step'],
    // v0.23 — Colfenor's Urn + 9 others: lazy "the end step" templating
    // (no qualifier). Semantically equivalent to "your end step" on the
    // controller's turn; many older delayed-trigger cards use this form.
    ['at the beginning of the end step, if three or more cards have been exiled with this artifact, sacrifice it.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Other phases / steps
    ['at the beginning of your upkeep, draw a card'],
    ['at the beginning of combat on your turn, this creature gets +1/+1 until end of turn'],
    ['at the beginning of each player\'s draw step'],
    // "Until end of turn" (effect duration, not a trigger)
    ['target creature gains flying until end of turn'],
    // Unrelated
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
