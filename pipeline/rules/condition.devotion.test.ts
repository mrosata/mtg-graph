import { describe, it, expect } from 'vitest';
import { rules } from './condition.devotion';

const ruleFor = (color: string) => rules.find((r) => r.id === `condition.devotion.${color}`)!;

describe('condition.devotion', () => {
  it('emits one rule per color', () => {
    expect(rules.map((r) => r.id).sort()).toEqual([
      'condition.devotion.black',
      'condition.devotion.blue',
      'condition.devotion.green',
      'condition.devotion.red',
      'condition.devotion.white',
    ]);
  });

  it.each([
    // Gray Merchant of Asphodel
    ['black', 'when this creature enters, each opponent loses x life, where x is your devotion to black.'],
    // Thassa, God of the Sea
    ['blue', 'as long as your devotion to blue is less than five, __self__ is not a creature.'],
    // Mogis, God of Slaughter
    ['black', 'at the beginning of each opponent’s upkeep, mogis deals 2 damage to that player unless they sacrifice a creature. while your devotion to black and red is less than seven, __self__ is not a creature.'],
    // Xenagos, God of Revels
    ['green', 'as long as your devotion to red and green is less than seven, xenagos is not a creature.'],
    // Athreos, Shroud-Veiled
    ['white', 'where x is your devotion to white and black.'],
  ])('matches devotion-to-%s', (color, text) => {
    expect(ruleFor(color).match!(text)).toBeTruthy();
  });

  it.each([
    ['black', 'put a +1/+1 counter on target creature.'],
    ['blue', 'target creature gets +1/+0 until end of turn.'],
    // Mentioning a color without "devotion to"
    ['red', 'red spells you cast cost {1} less to cast.'],
  ])('does not match (%s) on unrelated text', (color, text) => {
    expect(ruleFor(color).match!(text)).toBe(false);
  });
});
