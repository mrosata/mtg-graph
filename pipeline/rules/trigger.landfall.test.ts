// pipeline/rules/trigger.landfall.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.landfall';

describe('trigger.landfall', () => {
  it.each([
    // Twists and Turns // Mycoid Maze: "when a land you control enters".
    ['when a land you control enters, if you control seven or more lands, transform this enchantment'],
    // Bare "whenever a land enters" — generic landfall.
    ['whenever a land enters, create a 1/1 green plant creature token'],
    // Modern "landfall —" ability word (classic Zendikar template).
    ['landfall — whenever a land you control enters, you gain 1 life'],
    // "When another land you control enters" — sibling shape.
    ['when another land you control enters, draw a card'],
    // v0.27.x — typed-land ETB. Gate Colossus / Gateway Sneak: "whenever a
    // Gate you control enters". Gate is a LAND subtype, so the trigger is
    // landfall-axis even though the noun isn't the literal word "land".
    ["whenever a gate you control enters, this creature can't be blocked this turn."],
    ['whenever a gate you control enters, you may put this card from your graveyard on top of your library.'],
    ['whenever a cave you control enters, draw a card'],
    ['whenever a desert you control enters, scry 1'],
    ['whenever a plains you control enters, gain 1 life'],
    // v0.32 — Group 9 — The Endstone: "whenever you play a land or cast a
    // spell". The landfall half "you play a land" is the landfall trigger
    // axis even though the verb is "play" rather than "enters" (landfall RC
    // language treats them equivalently for trigger purposes).
    ['whenever you play a land or cast a spell, draw a card. at the beginning of your end step, your life total becomes half your starting life total, rounded up.'],
    // "When you play a land" — generic form.
    ['when you play a land, gain 1 life'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Non-land ETBs — different axes.
    ['whenever a creature you control enters, draw a card'],
    ['whenever an artifact enters, scry 1'],
    // Land-leaves-battlefield — opposite axis.
    ['whenever a land you control leaves the battlefield, gain 1 life'],
    // Lands-care without ETB trigger — condition.cares_lands.
    ['if you control five or more lands, draw a card'],
    // Unrelated.
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
