// pipeline/rules/trigger.another_artifact_etb.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.another_artifact_etb';

describe('trigger.another_artifact_etb', () => {
  it.each([
    // Elvish Archivist
    ['whenever one or more artifacts you control enter, put two +1/+1 counters on this creature'],
    // Singular variants common in older oracle templating
    ['whenever an artifact enters, draw a card'],
    ['whenever another artifact you control enters, this creature gets +1/+1 until end of turn'],
    ['whenever an artifact you control enters the battlefield, scry 1'],
    // v0.15 — intervening "with <stat-filter>" qualifier (Simulacrum
    // Synthesizer): "another artifact you control with mana value 3 or
    // greater enters". Post-noun qualifier slot widened from 3 to 8.
    ['whenever another artifact you control with mana value 3 or greater enters, create a 0/0 colorless construct artifact creature token'],
    // v0.15 — broad "noncreature, nonland permanents" framing (Builder's
    // Talent) is a superset that includes artifacts. Fires this trigger.
    ['whenever one or more noncreature, nonland permanents you control enter, put a +1/+1 counter on target creature you control'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Wrong permanent type — creature ETB
    ['whenever a creature enters'],
    ['whenever an enchantment you control enters'],
    // Self-ETB on an artifact (uses "this artifact")
    ['when this artifact enters, draw a card'],
    // Static, not a trigger
    ['artifacts you control have flying'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
