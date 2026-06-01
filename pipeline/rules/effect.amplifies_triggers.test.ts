// pipeline/rules/effect.amplifies_triggers.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.amplifies_triggers';

describe('effect.amplifies_triggers', () => {
  it.each([
    // Canonical Strionic Resonator / Roaming Throne / Delney template:
    // "If a triggered ability of <subject> triggers, that ability triggers
    // an additional time."
    ['if a triggered ability of a permanent you control triggers, that ability triggers an additional time'],
    ['if a triggered ability of a creature you control with power 2 or less triggers, that ability triggers an additional time'],
    ['if a triggered ability of another creature you control of the chosen type triggers, it triggers an additional time'],
    // ETB-cause variant — Virtue of Knowledge, Mardu Windcrag Siege.
    ['if a permanent entering causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time'],
    ['if a creature attacking causes a triggered ability of a permanent you control to trigger, that ability triggers an additional time'],
    // Equipment-context variant (Cloud, Midgar Mercenary).
    ['as long as cloud is equipped, if a triggered ability of cloud or an equipment attached to it triggers, that ability triggers an additional time'],
    // Generic "triggers an additional time" (anaphoric).
    ['that ability triggers an additional time'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Normal triggers without amplification.
    ['whenever this creature attacks, draw a card'],
    ['when this creature enters, scry 1'],
    // Anti-amplification (stax-style "triggered abilities don't trigger") —
    // opposite axis (Torpor Orb adjacent).
    ["triggered abilities don't trigger"],
    // Generic.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
