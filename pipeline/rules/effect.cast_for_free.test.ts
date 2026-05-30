import { describe, it, expect } from 'vitest';
import { rule } from './effect.cast_for_free';

describe('effect.cast_for_free', () => {
  it.each([
    // Beseech the Mirror
    ['you may cast the exiled card without paying its mana cost'],
    // Cascade-style
    ['you may cast that card without paying its mana cost'],
    // Cosmic Intervention / generic
    ['cast a spell without paying its mana cost'],
    // Variants
    ['cast that spell without paying its mana cost'],
    ['cast it without paying its mana cost'],
    // v0.14.7 — Regression (Flotsam // Jetsam): graveyard-source free cast.
    // The free-cast axis covers any zone source — exile, graveyard, library
    // top — as long as the mana cost is bypassed. The existing filler choked
    // on "opponent's" apostrophe and on the 6-token cap.
    ["you may cast a spell from each opponent's graveyard without paying its mana cost"],
    ['you may cast this card from your graveyard without paying its mana cost'],
    // v0.14.15 — plural framing: "may cast any number of ... spells ...
    // without paying their mana costs" (Kylox, Visionary Inventor). The
    // pre-existing determiner alternation (its|the|that spell's) didn't
    // accept "their" + plural "mana costs".
    ['you may cast any number of instant and/or sorcery spells from among the exiled cards without paying their mana costs'],
    ['cast those spells without paying their mana costs'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Normal cast — paid
    ['you may cast this spell from your graveyard'],
    ['cast target creature card from your hand'],
    // Tutor — finds a card but doesn't cast it free
    ['search your library for a card and put it into your hand'],
    // Cost reduction is a different axis
    ['this spell costs {2} less to cast'],
    ['flying'],
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
