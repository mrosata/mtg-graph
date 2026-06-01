// pipeline/rules/condition.raid.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.raid';

describe('condition.raid', () => {
  it.each([
    // Goblin Boarders — bare ability-word raid header.
    ['raid — this creature enters with a +1/+1 counter on it if you attacked this turn.'],
    // Gorehorn Raider — ETB raid trigger.
    ['raid — when this creature enters, if you attacked this turn, this creature deals 2 damage to any target.'],
    // Perforating Artist — keyword line then raid header on the same line.
    ['deathtouch raid — at the beginning of your end step, if you attacked this turn, each opponent loses 3 life unless that player sacrifices a nonland permanent of their choice or discards a card.'],
    // Gutless Plunderer — keyword line then raid header.
    ['deathtouch raid — when this creature enters, if you attacked this turn, look at the top three cards of your library.'],
    // Bare un-ability-worded form — "if you attacked this turn" without the
    // ability-word frame (Bloodsoaked Champion-style).
    ['{1}{b}: return this creature from your graveyard to the battlefield. activate only if you attacked this turn.'],
    // "if you've attacked this turn" contracted form.
    ['target creature gets +2/+0 until end of turn if you\'ve attacked this turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Combat trigger, not the raid gate.
    ['whenever this creature attacks, draw a card.'],
    // Opposite direction — a creature attacked you, not you attacked.
    ['if a creature attacked you this turn, destroy target creature.'],
    // Generic / unrelated.
    ['draw a card.'],
    ['put a +1/+1 counter on target creature.'],
    // The word raid as flavor without the em-dash anchor or gate.
    ['this is a raid on the village.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
