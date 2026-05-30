// pipeline/rules/trigger.counter_changed.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.counter_changed';

describe('trigger.counter_changed', () => {
  it.each([
    ['whenever a +1/+1 counter is placed on'],
    ['whenever one or more counters are removed from'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['put a +1/+1 counter on'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });

  it.each([
    ['whenever a +1/+1 counter is put on a creature you control'],
    ['whenever one or more counters are placed on a permanent'],
    ['whenever a counter is removed from a creature'],
    ['whenever you put a counter on a permanent'],
  ])('matches (added): %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
});
