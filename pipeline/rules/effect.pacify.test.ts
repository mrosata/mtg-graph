import { describe, it, expect } from 'vitest';
import { rule } from './effect.pacify';

describe('effect.pacify', () => {
  it.each([
    // Cooped Up
    ["enchanted creature can't attack or block"],
    // Pacifism
    ["enchanted creature can't attack"],
    // Aura/Equipment frame
    ["equipped creature can't block"],
    // v0.14.1 — "enchanted permanent" subject. Petrify enchants any
    // artifact-or-creature; the lockdown applies to the permanent.
    ["enchanted permanent can't attack or block, and its activated abilities can't be activated"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // The actual attack — a buff, not a lockdown
    ["target creature attacks if able"],
    // ETB / tap modifiers — different axis
    ["this creature enters tapped"],
    ["doesn't untap during your untap step"],
    ['draw a card'],
    ['flying'],
    // Regression (Breeches, Eager Pillager; Falter): "can't block this turn"
    // is a one-shot combat trick, not a permanent lockdown. Pacify is
    // Pacifism/Arrest semantics — until-removed, no time-bound clause.
    ["target creature can't block this turn"],
    ["up to two target creatures can't block this turn"],
    ["target creature can't attack until end of turn"],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
