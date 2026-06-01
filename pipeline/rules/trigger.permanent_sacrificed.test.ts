// pipeline/rules/trigger.permanent_sacrificed.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.permanent_sacrificed';

describe('trigger.permanent_sacrificed', () => {
  it.each([
    // Experimental Confectioner
    ['whenever you sacrifice a food, create a 1/1 black rat creature token'],
    // Korvold-style "whenever you sacrifice a permanent"
    ['whenever you sacrifice a permanent, put a +1/+1 counter on this creature and draw a card'],
    // Typed sacrifices
    ['whenever you sacrifice a creature, this creature gets +1/+1 until end of turn'],
    ['whenever you sacrifice an artifact, you gain 1 life'],
    ['whenever you sacrifice another creature, draw a card'],
    // Token typing
    ['whenever you sacrifice a treasure, this creature gets +1/+1 until end of turn'],
    ['whenever you sacrifice a clue, draw a card'],
    // Curious Cadaver — "When" (single-fire) trigger on Clue sacrifice.
    ['when you sacrifice a clue, return this card from your graveyard to your hand'],
    // Same shape with creature noun.
    ['when you sacrifice a creature, draw a card'],
    // Camellia, the Seedmiser — "one or more <plural>" determiner + plural noun.
    ['whenever you sacrifice one or more foods, create a 1/1 green squirrel creature token'],
    // Numeric determiner + plural — common aristocrat templating.
    ['whenever you sacrifice two or more creatures, draw a card'],
    // Generic permanent plural.
    ['whenever you sacrifice one or more permanents, this creature gets +1/+1'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Effect, not trigger
    ['sacrifice a creature: this creature gets +1/+1'],
    ['sacrifice an artifact, then draw a card'],
    // Opponent-sacrifice (different axis, less common)
    ['whenever an opponent sacrifices a creature'],
    // Dies trigger (different axis)
    ['whenever a creature dies, you gain 1 life'],
    // Unrelated
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
