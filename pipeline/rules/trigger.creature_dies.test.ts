// pipeline/rules/trigger.creature_dies.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.creature_dies';

describe('trigger.creature_dies', () => {
  it.each([
    ['whenever a creature dies'],
    ['whenever another creature you control dies'],
    // Regression: Fell Horseman — self-dies form. "When this creature dies"
    // and "when __self__ dies" are dying-ability triggers that should
    // participate in the death-trigger axis.
    ['when this creature dies, put it on the bottom of its owner\'s library'],
    ['when __self__ dies, return it to your hand'],
    ['whenever this creature dies'],
    // Adjective + qualifier filler — Gnawing Crescendo, Aristocrats-style
    ['whenever a nontoken creature you control dies this turn, create a 1/1 black rat creature token'],
    ['whenever a creature an opponent controls dies, draw a card'],
    ['whenever a white creature dies, you gain 1 life'],
    ['whenever a tapped creature you control dies'],
    // Regression (Explorer's Cache): "with a +1/+1 counter on it dies" — the
    // "+1/+1" requires the post-creature filler to admit +, /, -.
    ['whenever a creature you control with a +1/+1 counter on it dies, put a +1/+1 counter on this artifact.'],
    // v0.14.1 — plural subject. The Skullspore Nexus: "whenever one or more
    // nontoken creatures you control die".
    ['whenever one or more nontoken creatures you control die, create a green fungus dinosaur creature token'],
    ['whenever one or more creatures die, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['destroy target creature'],
    ['exile target creature'],
    // Stays unmatched: not a "dies" trigger.
    ['when this creature enters, scry 2'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
