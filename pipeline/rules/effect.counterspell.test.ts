import { describe, it, expect } from 'vitest';
import { rule } from './effect.counterspell';

describe('effect.counterspell', () => {
  it.each([
    ['counter target spell'],
    ['counter target creature spell'],
    ['counter target spell unless its controller pays {3}'],
    ['counter target noncreature spell'],
    // 2026-06-01 audit batch — Louisoix's Sacrifice: composite-target list
    // ending in "or noncreature spell". The list includes "activated
    // ability, triggered ability, OR noncreature spell" — because the
    // "spell" component is in the alternation, this IS a counterspell.
    ['counter target activated ability, triggered ability, or noncreature spell.'],
    // HIGH-12 (Glen Elendra's Answer): plural "counter all spells your opponents control".
    ['counter all spells your opponents control and all abilities your opponents control'],
    ['counter target spells your opponents control'],
    // v0.39.0 — Aven Interrupter: "exile target spell" counters via exile.
    // The end-result (spell never resolves) is the same as a counter.
    ['exile target spell.'],
    ['exile target spell an opponent controls.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['put a +1/+1 counter on target creature'],
    ['destroy target creature with a counter on it'],
    ['remove a +1/+1 counter from target creature'],
    ['destroy target creature'],
    ['draw a card'],
    ['this creature enters with a +1/+1 counter on it'],
    // v0.14.1 — ability counter is Stifle, NOT counterspell. Tishana's
    // Tidebinder counters abilities only; its tagDef scopes to "target spell"
    // on the stack. Drop `ability` from the alternation.
    ['counter target ability'],
    ['counter target activated or triggered ability'],
    ['when this creature enters, counter up to one target activated or triggered ability'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
