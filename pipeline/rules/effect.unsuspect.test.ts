import { describe, it, expect } from 'vitest';
import { rule } from './effect.unsuspect';

describe('effect.unsuspect', () => {
  it.each([
    // Absolving Lammasu — "are no longer suspected"
    ['all suspected creatures are no longer suspected.'],
    // Airtight Alibi — "it's no longer suspected"
    ["if it's suspected, it's no longer suspected."],
    // Eliminate the Impossible — "they're no longer suspected"
    ["if any of them are suspected, they're no longer suspected."],
    // Deadly Complication — "become no longer suspected" (modal "may have it become…")
    ['you may have it become no longer suspected.'],
    // Frantic Scapegoat — "is no longer suspected"
    ['if you do, this creature is no longer suspected.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Carer — "is suspected" without "no longer"
    ["if it's suspected, exile it."],
    // Producer
    ['when this creature enters, suspect it.'],
    // Bare reference without the clearer frame
    ['a suspected creature has menace.'],
    // Unrelated mechanic
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
