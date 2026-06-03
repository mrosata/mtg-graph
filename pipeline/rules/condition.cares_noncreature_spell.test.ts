import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_noncreature_spell';

describe('condition.cares_noncreature_spell', () => {
  it.each([
    ['whenever you cast a noncreature spell, draw a card'],
    ['whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn'],
    ['whenever you cast a sorcery or instant, scry 1'],
    ['whenever a player casts a noncreature spell, you may draw a card'],
    ['whenever you cast an instant or sorcery, deal 1 damage to any target'],
    // "When you next cast" — Gadwick's First Duel Saga III
    ['when you next cast an instant or sorcery spell with mana value 3 or less this turn, copy that spell'],
    ['when the next time you cast a noncreature spell this turn, copy it'],
    // Spell-anthem framings — Heartflame Duelist
    ['instant and sorcery spells you control have lifelink'],
    ['noncreature spells you control cost {1} less to cast'],
    // Regression (Mocking Sprite): "spells you cast cost" (cost reduction
    // framed against the caster's own casts rather than control-of-spells).
    ['instant and sorcery spells you cast cost {1} less to cast'],
    // v0.12.9 regression — ordinal/per-turn qualifiers between "cast" and the
    // spell descriptor (Aquatic Alchemist // Bubble Up).
    ['whenever you cast your first instant or sorcery spell each turn, this creature gets +2/+0 until end of turn'],
    ['whenever you cast your second noncreature spell each turn, draw a card'],
    // Imodane, the Pyrohammer — "whenever an instant or sorcery spell you
    // control ... deals damage" (the trigger gates on a spell, not on a cast).
    ['whenever an instant or sorcery spell you control that targets only a single creature deals damage to that creature, __self__ deals that much damage to each opponent'],
    ['whenever a noncreature spell you control resolves, draw a card'],
    // v0.14.1 — instant-only / sorcery-only trigger. Ojer Pakpatiq: "whenever
    // you cast an instant spell from your hand".
    ['whenever you cast an instant spell from your hand, it gains rebound'],
    ['whenever you cast a sorcery spell, draw a card'],
    // v0.14.30 — Melek, Reforged Researcher: "The first instant or sorcery
    // spell you cast each turn costs {3} less to cast." — non-trigger frame
    // (cost-reduction anthem) with an ordinal "the first" qualifier on the
    // spell descriptor. The existing anthem pattern required the "and"
    // connector ("instant and sorcery"); ordinal qualifiers use "or".
    ['the first instant or sorcery spell you cast each turn costs {3} less to cast.'],
    ["the second noncreature spell you cast each turn doesn't cost {1} more"],
    ['each instant or sorcery spell you cast costs {1} less to cast'],
    // Harnesser of Storms — disjunctive "noncreature or <tribe>" descriptor
    // ("whenever you cast a noncreature or Otter spell"). The intercalated
    // "or Otter" between "noncreature" and "spell" breaks the existing
    // anchor; the trigger fires on both halves (noncreature-spell AND tribal
    // creature-spell), but the noncreature-spell axis should at least
    // register from the noncreature half.
    ['whenever you cast a noncreature or otter spell, you may exile the top card of your library'],
    ['whenever you cast a noncreature or rat spell, draw a card'],
    // v0.35.0 — Batch 6: anthem-with-PP filler (Quandrix, the Proof). The
    // "spells you cast from your hand have cascade" form has a PP clause
    // ("from your hand") between "cast" and the anthem verb.
    ['flying, trample cascade instant and sorcery spells you cast from your hand have cascade.'],
    // v0.35.0 — Batch 6: activation/cast-conditional gate (Burrog Barrage,
    // Potioner's Trove). Payoff gates on "if you've cast an instant or
    // sorcery spell this turn".
    ["target creature you control gets +1/+0 until end of turn if you've cast another instant or sorcery spell this turn."],
    ["activate only if you've cast an instant or sorcery spell this turn"],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['whenever you cast a creature spell, draw a card'],         // opposite — creature spells
    ['whenever you cast this spell, gain 2 life'],                // self-cast
    ['search your library for an instant or sorcery card'],       // looking, not casting
    ['draw a card'],
    ['destroy target creature'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
