// pipeline/rules/effect.loses_abilities.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.loses_abilities';

describe('effect.loses_abilities', () => {
  it.each([
    // Canonical "loses all abilities" silence-style removal.
    // Eaten by Piranhas, Witness Protection, Stop Cold, Fresh Start.
    ['enchanted creature loses all abilities and is a black skeleton creature'],
    ['enchanted permanent loses all abilities and doesn\'t untap during its controller\'s untap step'],
    ['enchanted creature gets -3/-0 and loses all abilities'],
    // Plural subject — "all creatures lose all abilities" (Final Showdown).
    ['all creatures lose all abilities until end of turn'],
    // Anaphoric "it loses all abilities" — Tishana's Tidebinder.
    ['that permanent loses all abilities until your next turn'],
    // Azure Beastbinder's "loses all abilities until your next turn".
    ['up to one target artifact, creature, or planeswalker an opponent controls loses all abilities'],
    // "Has/have no abilities" alternative phrasing.
    ['that creature has no abilities'],
    // v0.20 — "loses all (other) card types and abilities" (Sugar Coat).
    ['enchanted permanent is a colorless food artifact with " {2}, {t}, sacrifice this artifact: you gain 3 life " and loses all other card types and abilities.'],
    ['enchanted creature loses all other card types and abilities until end of turn'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Loses keywords / a specific keyword — different axis (granular removal).
    ['enchanted creature loses flying'],
    ['target creature loses haste'],
    // Counter-an-ability — different axis (counterspell-on-ability).
    ['counter target ability'],
    // Static grant of an ability — opposite direction.
    ['enchanted creature has flying'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
