import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_islands';

describe('condition.cares_islands', () => {
  it.each([
    // Eluge — P/T scales with Islands
    ["this creature's power and toughness are each equal to the number of islands you control"],
    // Tempest Djinn — counter-stack scaling
    ['tempest djinn gets +1/+0 for each basic island you control'],
    // Waterbending Scroll-style trigger
    ['whenever an island enters under your control, scry 1'],
    // Generic "for each Island you control"
    ['for each island you control'],
    // Cards mentioning "you control X or more Islands"
    ['if you control four or more islands, this creature gets +2/+2'],
    // Cost-side Island references — Waterlogged Hulk craft cost exiles an
    // Island. The card still "needs Islands" to function even though it
    // doesn't scale with them.
    ['exile an island you control or an island card from your graveyard'],
    ['{3}{u}, exile this artifact, exile an island you control'],
    // Activated cost requiring tapping an Island
    ['tap an untapped island you control: scry 1'],
    // Craft with Island (LCI transform mechanic) — reminder text gets
    // stripped, so the only surviving anchor is the keyword line.
    ['{t}: mill a card. craft with island {3}{u}'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Mentions "island" only as a basic land type in mana-fixing tutors
    ['search your library for a basic land card'],
    ['search your library for an island card and put it onto the battlefield tapped'],
    // Just adds blue mana — no island reference
    ['add {u}'],
    // Eluge's own ETB clause uses "land" not "island" — covered by land_becomes_island
    ['put a flood counter on target land'],
    // Generic creature pump
    ['this creature gets +1/+1 until end of turn'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
