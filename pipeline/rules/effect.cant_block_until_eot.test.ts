// pipeline/rules/effect.cant_block_until_eot.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.cant_block_until_eot';

describe('effect.cant_block_until_eot', () => {
  it.each([
    // Frenzied Goblin — canonical anaphoric attack-trigger body.
    ["whenever this creature attacks, you may pay {r}. if you do, target creature can't block this turn."],
    // Sandstorm Verge / Sower of Chaos / Brambleback Brute — simple form.
    ["target creature can't block this turn"],
    // Bellowing Bruiser // Beat a Path — two-target.
    ["up to two target creatures can't block this turn"],
    // War Squeak — opponent-scoped target.
    ["target creature an opponent controls can't block this turn"],
    // Modal — Daring Discovery / Untimely Malfunction (plural via mode).
    ["target creatures can't block this turn"],
  ])('matches block-disable phrasings: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pacifism family — permanent lockdown, different axis.
    ["enchanted creature can't attack or block"],
    ["target creature can't attack or block until your next turn"],
    // Unblockable — opposite axis (creature you control can't be blocked).
    ["this creature can't be blocked"],
    ["target creature can't be blocked this turn"],
    // Attack-disable only — different axis.
    ["target creature can't attack"],
    ["target creature can't attack until end of turn"],
    // Unrelated — buff.
    ['target creature gets +2/+0 until end of turn'],
    // Unrelated — destroy.
    ['destroy target creature'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
