import { describe, it, expect } from 'vitest';
import { rule } from './effect.flicker';

describe('effect.flicker', () => {
  it.each([
    // Kykar, Zephyr Awakener — exile + delayed end-step return.
    ["exile another target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    // Charming Prince — exile + delayed end-step return.
    ['exile another target creature you own. return it to the battlefield under your control at the beginning of the next end step.'],
    // Ennis, Debate Moderator — "exile up to one other target creature".
    ["when ennis enters, exile up to one other target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    // Niko, Light of Hope — sentence-bridged delayed return.
    ["{2}, {t}: exile target nonlegendary creature you control. shards you control become copies of it until the next end step. return it to the battlefield under its owner's control at the beginning of the next end step."],
    // Generic flicker — "return it to the battlefield ... at the beginning of the next end step"
    ['exile target creature. return it to the battlefield at the beginning of the next end step.'],
    // Until-end-of-turn variant: "exile ... return ... at the beginning of the next turn"
    ['exile target creature. return that card to the battlefield at the beginning of the next turn.'],
    // 2026-06-02 audit batch — Hide on the Ceiling: exiles a mixed bag of
    // artifacts and/or creatures, then refers to them as "the exiled cards".
    // The return-anaphor needs to admit "the exiled cards/creatures/permanents"
    // in addition to "it"/"them"/"that card"/"that creature".
    ["exile x target artifacts and/or creatures. return the exiled cards to the battlefield under their owners' control at the beginning of the next end step."],
    ['exile two target creatures. return the exiled creatures to the battlefield at the beginning of the next end step.'],
    ['exile target permanent. return the exiled permanent to the battlefield at the beginning of the next end step.'],
    // HIGH-9 (Morningtide's Light): "exile any number of target creatures. at the beginning of the next end step, return those cards to the battlefield".
    ["exile any number of target creatures. at the beginning of the next end step, return those cards to the battlefield tapped under their owners' control."],
    // v0.35.0 — Batch 19: ransom-branch flicker (Koya, Death from Above).
    // "Exile X. At the beginning of the next end step, you may pay {3}{B}.
    // If you don't, return that card to the battlefield." The default
    // (no-pay) path is canonical flicker; the optional pay branch keeps
    // the card exiled.
    ["flying when __self__ enters, exile up to one other target creature. at the beginning of the next end step, you may pay {3}{b}. if you don't, return that card to the battlefield under its owner's control."],
    // v0.47.0 — Wiccan, Rising Magician: "exile another target nonland,
    // nontoken permanent". The comma between "nonland" and "nontoken"
    // breaks the `(?:[\w\-\/]+\s+){0,5}?` filler which requires trailing
    // whitespace. Change filler to `(?:[\w\-\/]+[,\s]+){0,5}?`.
    ["exile another target nonland, nontoken permanent. at the beginning of the next end step, return that card to the battlefield under its owner's control."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Plain bounce — return to hand, not exile + delayed return.
    ["return target creature to its owner's hand"],
    // Blink (immediate return) — not flicker (which is delayed).
    ['exile target creature you control, then return it to the battlefield under its owner\'s control.'],
    ['exile target creature, then return that creature to the battlefield under its owner\'s control'],
    // Reanimate — graveyard → battlefield.
    ['return target creature card from your graveyard to the battlefield.'],
    // Plain exile without return.
    ['exile target creature'],
    // Delayed return TO HAND (bounce-blinkback like Anzrag's Rampage) — not flicker.
    ['you may put a creature card exiled this way onto the battlefield. it gains haste. return it to your hand at the beginning of the next end step'],
    // Cheat into play — onto battlefield from hand, no exile first.
    ['put a creature card from your hand onto the battlefield'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
