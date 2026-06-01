import { describe, it, expect } from 'vitest';
import { rule } from './effect.produces_energy';

describe('effect.produces_energy', () => {
  it.each([
    // Aether Hub
    ['when this land enters, you get {e}.'],
    // Aetherwind Basker
    ['whenever this creature enters or attacks, you get {e} for each creature you control.'],
    // Aethersquall Ancient
    ['at the beginning of your upkeep, you get {e}{e}{e}.'],
    // Aethertide Whale
    ['when this creature enters, you get six {e}.'],
    // Aetherflux Conduit
    ['whenever you cast a spell, you get an amount of {e} equal to the amount of mana spent to cast that spell.'],
    // Architect of the Untamed
    ['landfall — whenever a land you control enters, you get {e}.'],
    // Attune with Aether
    ['you get {e}{e}.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pay (spend), not produce
    ['{t}, pay {e}: add one mana of any color.'],
    // No energy at all
    ['draw a card.'],
    // Mana token (curly-e is a known glyph for energy; ensure word "energy" alone doesn't trip)
    ['this card costs less to cast when activated.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
