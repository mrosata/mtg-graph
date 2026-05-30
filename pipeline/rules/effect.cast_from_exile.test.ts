import { describe, it, expect } from 'vitest';
import { rule } from './effect.cast_from_exile';

describe('effect.cast_from_exile', () => {
  it.each([
    // Theft / temporary control of opponent's exiled cards
    ['target opponent exiles the top x cards of their library face down. you may look at and play those cards for as long as they remain exiled. if you cast a spell this way, you may spend mana as though it were mana of any type to cast it'],
    ['its controller looks at the top card of that opponent\'s library and exiles it face down. they may play that card for as long as it remains exiled. mana of any type can be spent to cast a spell this way'],
    // Anaphoric "cast a spell this way" (Intrepid Paleontologist, Osteomancer
    // Adept, Valgavoth, Gonti, Outrageous Robbery — they all follow an exile
    // clause earlier in the same ability)
    ['you may cast a spell this way'],
    ['if you cast a spell this way, you may spend mana as though it were mana of any type to cast it'],
    // From-among-exiled-cards cast (Voltstrider, Kylox)
    ['you may cast an instant or sorcery spell from among cards exiled with it'],
    ['cast any number of instant and/or sorcery spells from among the exiled cards without paying their mana costs'],
    ['you may cast a creature spell from among cards exiled with __self__'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Adventure DFC templating MUST NOT match — already covered by
    // effect.adventure_card via subtype.
    ['exile this card. you may cast the creature later from exile'],
    ['cast the creature later from exile'],
    // Lazav: "become a copy of a creature card exiled with it" — clone, NOT
    // a cast. The "cards exiled with" substring shouldn't fire without a
    // leading "cast" verb.
    ['you may have __self__ become a copy of a creature card exiled with it until end of turn'],
    // Passive exile-pile reference without a cast verb
    ['cards you own in exile'],
    ['for each card exiled with __self__'],
    // Unrelated text
    ['exile target creature'],
    ['draw a card'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
