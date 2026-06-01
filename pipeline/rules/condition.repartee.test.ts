import { describe, it, expect } from 'vitest';
import { rule } from './condition.repartee';

describe('condition.repartee', () => {
  it.each([
    // Lecturing Scornmage
    ['repartee — whenever you cast an instant or sorcery spell that targets a creature, put a +1/+1 counter on this creature.'],
    // Conciliator's Duelist
    ['repartee — whenever you cast an instant or sorcery spell that targets a creature, exile up to one target creature.'],
    // Forum Necroscribe
    ['repartee — whenever you cast an instant or sorcery spell that targets a creature, return target creature card from your graveyard to your hand.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // No ability-word anchor; generic spell-cast trigger
    ['whenever you cast an instant or sorcery spell, put a +1/+1 counter on this creature.'],
    // Flavor word "repartee" without em-dash
    ['the scholars engaged in clever repartee for hours.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
