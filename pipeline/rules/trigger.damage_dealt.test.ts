// pipeline/rules/trigger.damage_dealt.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.damage_dealt';

describe('trigger.damage_dealt', () => {
  it.each([
    ['whenever __self__ deals damage to a player'],
    ['whenever a creature deals combat damage'],
    ['whenever a source deals damage to you'],
    ['whenever __self__ deals combat damage to a player, draw a card'],
    // Expedited Inheritance — passive-voice "is dealt damage" trigger.
    ['whenever a creature is dealt damage, its controller may exile that many cards from the top of their library'],
    // Player passive variant.
    ['whenever a player is dealt combat damage by a creature you control, draw a card'],
    // Plural-subject passive.
    ['whenever one or more creatures are dealt damage, create a treasure token'],
    // v0.14.9 — Regression (Innocent Bystander): multi-word quantifier "N or
    // more damage". Existing rule's `(?:\w+ )?` allows only ONE word between
    // verb and "damage" — "3 or more damage" has three words and whiffs.
    // Recurring family — "N or more damage" payoff cards.
    ['whenever this creature is dealt 3 or more damage, investigate'],
    ['whenever __self__ is dealt 5 or more damage, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['__self__ deals 2 damage to any target'],
    // Regression (Scalding Viper): the trigger fires on spell-cast, the
    // "deals damage" portion is the effect — not a damage-dealt trigger.
    ['whenever an opponent casts a spell with mana value 3 or less, __self__ deals 1 damage to that player'],
    // Regression (Skewer Slinger): blocks/blocked trigger with damage as
    // effect — block trigger, not damage-dealt.
    ['whenever __self__ blocks or becomes blocked by a creature, __self__ deals 1 damage to that creature'],
    // NEGATIVE: "...whenever X happens, [subject] is dealt damage" — the
    // "is dealt damage" is an effect inside another trigger's body, not its
    // own trigger condition. The clause boundary (comma) must separate them.
    ['whenever an opponent casts a spell, target creature is dealt 1 damage'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
