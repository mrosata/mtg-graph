import { describe, it, expect } from 'vitest';
import { rule } from './effect.copy_spell';

describe('effect.copy_spell', () => {
  it.each([
    ['copy target spell'],
    ['copy target instant or sorcery spell'],
    ['copy that spell'],
    ['copy the spell'],
    ['copy target instant'],
    ['copy target sorcery'],
    ['whenever you cast an instant or sorcery spell, copy it'],
    ['copy it for each other instant and sorcery spell you cast'],
    // v0.14.22 — "Copy it. You may cast the copy" frame (Reenact the Crime).
    // The "Copy it" anaphor refers to an exiled card, and the subsequent
    // "cast the copy" / "cast that copy" clause confirms the copy is a
    // spell (you can only `cast` a spell, not a creature in play).
    ['exile target nonland card in a graveyard. copy it. you may cast the copy without paying its mana cost'],
    ['exile target instant or sorcery card from a graveyard. copy it. you may cast that copy'],
    // v0.30 — Group 27 — Mendicant Core, Guidelight: cast-trigger then
    // "copy it" across a sentence boundary ("...you may pay {1}. if you
    // do, copy it."). Sentence-spanning variant of CAST_SPELL_THEN_COPY_IT.
    ["__self__'s power is equal to the number of artifacts you control. start your engines! max speed — whenever you cast an artifact spell, you may pay {1}. if you do, copy it."],
    ['whenever you cast a sorcery, you may pay {2}. if you do, copy it.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['copy target creature'],                                     // -> effect.clone_in_place
    ['create a token that is a copy of target creature'],         // -> effect.copy_permanent_token
    ['create a token that\'s a copy of target permanent'],        // -> effect.copy_permanent_token
    ['draw a card'],                                              // unrelated
    ['destroy target creature'],                                  // unrelated
    ['copy this creature'],                                       // not target/that/the spell phrasing
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
