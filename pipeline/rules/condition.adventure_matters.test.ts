import { describe, it, expect } from 'vitest';
import { rule } from './condition.adventure_matters';

describe('condition.adventure_matters', () => {
  it.each([
    ['whenever you cast an adventure spell, draw a card'],
    ['whenever you cast an adventure, this creature gets +1/+1 until end of turn'],
    ['whenever you cast another adventure spell, scry 1'],
    ['adventure spells you cast cost {1} less to cast'],
    ['return target adventure card from your graveyard to your hand'],
    ['permanent spells you cast that have an adventure cost {1} less to cast'],
    ['return target card that has an adventure from your graveyard to your hand'],
    ['this creature has haste as long as you own a card in exile that has an adventure'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['draw a card'],
    ['destroy target creature'],
    ['flying'],
    ['create a treasure token'],
    ['gain 3 life'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
