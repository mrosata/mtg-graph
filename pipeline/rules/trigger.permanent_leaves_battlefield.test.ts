import { describe, it, expect } from 'vitest';
import { rule } from './trigger.permanent_leaves_battlefield';

describe('trigger.permanent_leaves_battlefield (parent, universal-only)', () => {
  it.each([
    ['whenever a permanent leaves the battlefield'],
    ['whenever a permanent you control leaves the battlefield'],
    ['when another permanent leaves the battlefield'],
    ['whenever a nontoken permanent leaves the battlefield'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Type-specific must NOT match the parent
    ['whenever a creature leaves the battlefield'],
    ['whenever an artifact leaves the battlefield'],
    ['whenever an enchantment leaves the battlefield'],
    ['when this creature leaves the battlefield'],
    // Type-excluding modifiers must NOT match (parent reserved for universal)
    ['whenever a nonland permanent leaves the battlefield'],
    ['whenever a noncreature permanent leaves the battlefield'],
    // Dies is its own tag
    ['whenever a creature dies'],
    // Descriptive prose
    ['the creature leaves the battlefield'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
