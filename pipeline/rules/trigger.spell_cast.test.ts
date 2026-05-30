// pipeline/rules/trigger.spell_cast.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.spell_cast';

describe('trigger.spell_cast', () => {
  it.each([
    ['whenever you cast a spell'],
    ['whenever you cast an instant spell'],
    // Regression (Splashy Spellcaster): "an instant or sorcery spell" — multi-
    // type qualifier.
    ['whenever you cast an instant or sorcery spell, create a sorcerer role token'],
    // Regression (Storyteller Pixie): subtype-filtered spell trigger.
    ['whenever you cast an adventure spell, draw a card'],
    // Regression (Scalding Viper): opponent-cast / "an opponent casts" form —
    // the punisher / pingback shape.
    ['whenever an opponent casts a spell with mana value 3 or less, __self__ deals 1 damage to that player'],
    ['whenever a player casts a noncreature spell, draw a card'],
    // v0.12.9 — ordinal/per-turn qualifier (Aquatic Alchemist // Bubble Up):
    // "whenever you cast your first instant or sorcery spell each turn …".
    ['whenever you cast your first instant or sorcery spell each turn, this creature gets +2/+0 until end of turn'],
    ['whenever you cast your second noncreature spell each turn, draw a card'],
    ['whenever you cast the next noncreature spell each turn, copy it'],
    // Regression (Lilah, Undefeated Slickshot): adjective prefix + multi-type
    // qualifier — "a multicolored instant or sorcery spell". The single-
    // qualifier-slot regex only handled `<single-word>` or `<word> or
    // <word>`; the leading adjective `multicolored` defeated the anchor.
    ['prowess whenever you cast a multicolored instant or sorcery spell from your hand, exile that spell instead of putting it into your graveyard as it resolves'],
    ['whenever you cast a multicolored instant or sorcery spell, draw a card'],
    ['whenever you cast a multicolored noncreature spell, copy it'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a token when you cast'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
