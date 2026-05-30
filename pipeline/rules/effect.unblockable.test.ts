import { describe, it, expect } from 'vitest';
import { rule } from './effect.unblockable';

describe('effect.unblockable', () => {
  it.each([
    // Slither Blade / Triton Shorestalker: intrinsic full unblockability.
    ["this creature can't be blocked."],
    ["__self__ can't be blocked."],
    // Anthem-style grant to your creatures.
    ["creatures you control can't be blocked this turn"],
    // Temporary single-target grant.
    ["target creature can't be blocked this turn"],
    // Furtive Courier: conditional gate ("as long as").
    ["this creature can't be blocked as long as you've sacrificed an artifact this turn"],
    // Ninja-of-the-Deep-Hours-style: "this creature can't be blocked except by creatures with flying or reach" — wait, the "except by" form
    // is partial unblockability and EXCLUDED. See negative case below.
    // Tetzimoc tribal-style anthem.
    ["whenever this creature attacks, it can't be blocked this turn"],
    // v0.14.32 — Pompous Gadabout: "can't be blocked by creatures that don't
    // have a name". The blocker-restriction is near-tautological (~all
    // creatures have names except some tokens) — functionally near-
    // unblockable. The "that don't have <X>" inverse phrasing is what
    // qualifies; the restrictive "that have <X>" form remains partial
    // evasion and excluded.
    ["this creature can't be blocked by creatures that don't have a name."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Protection-style PARTIAL unblockability ("by X" qualifier) — different
    // axis. Pump-evasion that dodges only some blockers is not the same as
    // Slither-Blade full unblockability for graph-edge purposes.
    ["this creature can't be blocked by red creatures"],
    ["this creature can't be blocked except by creatures with flying or reach"],
    ["target creature can't be blocked by creatures with power 3 or greater"],
    // Pacify family — locks the creature down (can't attack OR block).
    // "Enchanted creature can't attack or block" — no "can't be blocked".
    ["enchanted creature can't attack or block"],
    // Unrelated text.
    ['target creature gets +2/+2 until end of turn'],
    ['draw a card'],
    // Block-restriction on power gate — different axis (Delney-style).
    ["creatures with power 2 or less can't be blocked by creatures with power 3 or greater"],
    // Restrictive "can't be blocked by creatures that HAVE flying" — partial
    // anti-air-evasion. NOT near-unblockable; only the inverse phrasing
    // ("that don't have <X>") is near-unblockable.
    ["this creature can't be blocked by creatures that have flying"],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
