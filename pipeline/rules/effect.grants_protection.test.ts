// pipeline/rules/effect.grants_protection.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.grants_protection';

describe('effect.grants_protection', () => {
  it.each([
    // "has protection from <X>"
    ['equipped creature has protection from creatures'],
    ['enchanted creature has protection from the chosen color'],
    ['equipped creature gets +2/+2 and has protection from instants and from sorceries'],
    ['equipped creature gets +2/+2 and has protection from green and from white'],
    // "gains protection from <X>" — temporary or perpetual grant.
    ['target creature you control gains protection from each color until your next turn'],
    ['you gain protection from everything until your next turn'],
    ['you gain protection from each of your opponents'],
    // "have protection from <X>" — anthem-style.
    ['creatures you control have protection from black'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Standalone "protection" without "from" — different axis (Protection
    // Aura subtype, "Protection of the Hekma" flavor noun).
    ['this card is named protection'],
    ['ward {2}'],
    // Not a grant — "loses protection".
    ['enchanted creature loses protection from green'],
    // Generic.
    ['draw a card'],
    ['gains flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
