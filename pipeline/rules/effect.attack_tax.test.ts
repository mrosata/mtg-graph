import { describe, it, expect } from 'vitest';
import { rule } from './effect.attack_tax';

describe('effect.attack_tax', () => {
  it.each([
    // Propaganda / Ghostly Prison template
    ["creatures can't attack you unless their controller pays {2}."],
    // Cost-to-attack frame
    ['creatures attacking you cost {1} more to attack.'],
    // "each opponent attacks with creatures only if they pay" frame
    ['each opponent attacks with creatures only if they pay {1} for each one.'],
    // Variation: "unless they pay"
    ["players can't attack you unless they pay {3}."],
    // Multi-phrasing
    ["creature can't attack unless its controller pays {1}."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Not attack tax — generic cost
    ['create a 1/1 token.'],
    // Destroy — not tax
    ['destroy target creature.'],
    // Defender effect, not attack tax
    ["creatures you control can't be blocked."],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
