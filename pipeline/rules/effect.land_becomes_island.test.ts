import { describe, it, expect } from 'vitest';
import { rule } from './effect.land_becomes_island';

describe('effect.land_becomes_island', () => {
  it.each([
    // Eluge — flood counter making a land an Island
    ["put a flood counter on target land. it's an island in addition to its other types for as long as it has a flood counter on it"],
    // Avatar Kyoshi — back face
    ["each land you control becomes an island in addition to its other types"],
    // Just "flood counter" anywhere
    ['put a flood counter on target land'],
    // Future-proofing: "becomes an Island"
    ['that land becomes an island until end of turn'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Generic ramp — search for an Island and put it onto battlefield (different effect)
    ['search your library for an island card and put it onto the battlefield tapped'],
    // Add mana — not changing land type
    ['{t}: add {u}'],
    // Creating an Island land token (LCI) — that creates a NEW land, not mutates an existing one
    ['create a tapped island land token'],
    // Just bouncing a land
    ["return target land to its owner's hand"],
    // Manland animation — becomes a creature, not an Island
    ['this land becomes a 2/1 elemental creature until end of turn'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
