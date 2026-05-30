import { describe, it, expect } from 'vitest';
import { rule } from './trigger.collected_evidence';

describe('trigger.collected_evidence', () => {
  it.each([
    // Evidence Examiner
    ['whenever you collect evidence, investigate.'],
    // Surveillance Monitor
    ['whenever you collect evidence, create a 1/1 colorless thopter artifact creature token with flying.'],
    // Hypothetical future card — the trigger frame at end of a clause
    ['flying. whenever you collect evidence, draw a card.'],
    // v0.14.9 — Regression (Incinerator of the Guilty): reflexive "may
    // collect evidence X. When you do, ..." frame creates a delayed trigger
    // that fires on the keyword action. Semantically the same axis as
    // "whenever you collect evidence" for graph-edge purposes — the card
    // CARES about collecting evidence as a precondition for an effect.
    // (Reverses the prior negative-test policy for this frame.)
    ['whenever this creature deals combat damage to a player, you may collect evidence x. when you do, this creature deals x damage to each creature and planeswalker that player controls.'],
    ['you may collect evidence 3. when you do, put a +1/+1 counter on target creature you control.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Producer alone — not a trigger (no "when you do" follow-on)
    ['you may collect evidence 4.'],
    // Modal gate — not the trigger
    ['if evidence was collected, draw a card.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
