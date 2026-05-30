import { describe, it, expect } from 'vitest';
import { rule } from './effect.counterspell';

describe('effect.counterspell', () => {
  it.each([
    ['counter target spell'],
    ['counter target creature spell'],
    ['counter target spell unless its controller pays {3}'],
    ['counter target noncreature spell'],
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
