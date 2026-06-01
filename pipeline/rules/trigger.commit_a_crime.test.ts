// pipeline/rules/trigger.commit_a_crime.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.commit_a_crime';

describe('trigger.commit_a_crime', () => {
  it.each([
    // Canonical MKM template. "You commit a crime" by targeting opponents,
    // their permanents, or cards in their graveyards/hand/library.
    ['whenever you commit a crime, create a 1/1 red mercenary creature token'],
    ['whenever you commit a crime, put a loot counter on this artifact'],
    ['whenever you commit a crime, put a +1/+1 counter on this creature'],
    ['whenever you commit a crime, each opponent mills three cards'],
    ['whenever you commit a crime, you may draw a card'],
    ['whenever you commit a crime, you may pay {b}'],
    // Once-per-turn qualifier suffix doesn't change the trigger anchor.
    ['whenever you commit a crime, draw a card. this ability triggers only once each turn'],
    // Past-tense "you committed a crime" in conditional gates.
    ['if you have committed a crime this turn, draw a card'],
    // Contraction: "you've committed a crime" (Nimble Brigand, Omenport
    // Vigilante, Servant of the Stinger).
    ["this creature can't be blocked if you've committed a crime this turn"],
    ["this creature has double strike as long as you've committed a crime this turn"],
    // Opponent-side trigger (Patrolling Peacemaker).
    ['whenever an opponent commits a crime, proliferate'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    // Different mechanic (suspect — also MKM, also crime-adjacent, but
    // different verb / trigger axis).
    ['suspect target creature an opponent controls'],
    // Generic card text.
    ['draw a card'],
    ['create a 1/1 mercenary creature token'],
    // Flavor / non-mechanic uses of "crime" — none in real oracle text but
    // guard against future drift.
    ['the crime scene investigators arrived'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
