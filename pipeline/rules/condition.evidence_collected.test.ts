import { describe, it, expect } from 'vitest';
import { rule } from './condition.evidence_collected';

describe('condition.evidence_collected', () => {
  it.each([
    // Analyze the Pollen — modal upgrade
    ['if evidence was collected, instead search your library for a creature or land card.'],
    // Bite Down on Crime — cost reduction
    ['this spell costs {2} less to cast if evidence was collected.'],
    // Deadly Cover-Up — extra-effect rider
    ["if evidence was collected, exile a card from an opponent's graveyard."],
    // Behind the Mask — alternate stats rider
    ['if evidence was collected, it has base power and toughness 1/1 until end of turn instead.'],
    // Vitu-Ghazi Inspector — ETB conditional
    ['when this creature enters, if evidence was collected, put a +1/+1 counter on target creature and you gain 2 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Producer phrasing — not the gate
    ['you may collect evidence 6.'],
    // Per-collect trigger — not the gate
    ['whenever you collect evidence, investigate.'],
    // Partial phrase only
    ['evidence collected'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
    ['create a clue token.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
