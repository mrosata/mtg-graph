// pipeline/rules/trigger.beginning_of_combat.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.beginning_of_combat';

describe('trigger.beginning_of_combat', () => {
  it.each([
    // Halana and Alena, Partners / Innkeeper's Talent (standard "on your turn" form)
    ['at the beginning of combat on your turn, put a +1/+1 counter on target creature you control.'],
    // Sinister Monolith — symmetric drain
    ['at the beginning of combat on your turn, each opponent loses 1 life and you gain 1 life.'],
    // Nexus of Becoming — draw-and-copy variant
    ['at the beginning of combat on your turn, draw a card.'],
    // Conditional ferocious / formidable wrapper
    ['ferocious — at the beginning of combat on your turn, if you control a creature with power 4 or greater, you may pay {r}.'],
    // Each combat (rarer scope)
    ['at the beginning of each combat, this creature gets +1/+0 until end of turn.'],
    // Ashiok token clause has "at the beginning of combat on your turn" inside a granted ability
    ['create two 1/1 black nightmare creature tokens with "at the beginning of combat on your turn, if a card was put into exile this turn, put a +1/+1 counter on this token."'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Other phase triggers
    ['at the beginning of your end step, draw a card.'],
    ['at the beginning of your upkeep, you gain 1 life.'],
    ['at the beginning of each player\'s draw step, draw a card.'],
    // Combat-adjacent prose but not a beginning-of-combat trigger
    ['whenever this creature attacks, draw a card.'],
    ['this creature deals combat damage to a player.'],
    ['before combat damage is dealt, sacrifice this creature.'],
    // Unrelated
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
