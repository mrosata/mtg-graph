import { describe, it, expect } from 'vitest';
import { rule } from './effect.counter_modified';

describe('effect.counter_modified', () => {
  it.each([
    ['put a +1/+1 counter on'],
    ['remove a charge counter from'],
    ['place a loyalty counter on'],
    ['put 2 -1/-1 counters on'],
    ['put a counter on target creature'],
    // Named counters that weren't in the old alternation
    ['put three stun counters on it'],                // Freeze in Place, Galvanic Giant
    ['put a time counter on target permanent'],
    ['put a lore counter on it'],
    ['put an ice counter on'],
    // Variable-count framings
    ['put a number of +1/+1 counters equal to its power on each creature you control'], // Gruff Triplets
    ['put any number of -1/-1 counters on target creature'],
    ['put that many +1/+1 counters on'],
    // Regression (Picnic Ruiner — Stolen Goodies): "distribute N counters
    // among" — different verb from "put", same axis.
    ['distribute three +1/+1 counters among any number of target creatures you control'],
    // Regression (Sleep-Cursed Faerie): "enters [tapped] with [N] [type]
    // counters on it" — static ETB counter form, not the active "put" verb.
    ['this creature enters tapped with three stun counters on it'],
    ['this creature enters with two +1/+1 counters on it'],
    ['this creature enters with a charge counter on it'],
    // Regression (The Goose Mother): variable-amount ETB-with — quantifier is
    // the letter X (scales with mana value paid). Sister-pattern to the "put"
    // verb arm which already lists `x` as a valid quantifier.
    ['__self__ enters with x +1/+1 counters on it'],
    // v0.14.18 — player-counter placement uses the "gets" verb form instead
    // of "puts/places". Persuasive Interrogators, Fynn the Fangbearer,
    // Virulent Silencer: poison counters on a player. Generalizes to
    // experience / energy / rad / ki counters on a player too.
    ['target opponent gets two poison counters'],
    ['that player gets two poison counters'],
    ['each opponent gets a poison counter'],
    ['you get an experience counter'],
    ['target player gets a rad counter'],
    // v0.20 — return-to-battlefield-with-counter (Parting Gust).
    ['return target creature to the battlefield under its owner\'s control with a +1/+1 counter on it'],
    // v0.20 — Salvation Swan.
    ['return that card to the battlefield with a flying counter on it'],
    // v0.20 — multi-clause filler.
    ['return target creature card from your graveyard to the battlefield with two +1/+1 counters on it'],
    // v0.21.0 — Ghost Vacuum: "put each creature card ... onto the
    // battlefield under your control with a flying counter on it". The
    // existing "return ... with <kw> counter" arm covered return-shaped
    // reanimation; this admits put-onto-battlefield-with-counter where
    // "under your control" stands in for "to the battlefield".
    ['put each creature card exiled with this artifact onto the battlefield under your control with a flying counter on it'],
    // v0.21.0 — Meathook Massacre II: "return that card under your control
    // with a finality counter on it". Dies-trigger reanimate with counter
    // — no explicit "to the battlefield" between verb and "with <counter>".
    ['return that card under your control with a finality counter on it'],
    // v0.30 — Group 29 — Thunderous Velocipede: ETB-with-counter arm needs
    // to admit "additional" / "another" between the quantifier and the
    // counter-type slot (sibling "put" arm already has it).
    ['trample each other vehicle and creature you control enters with an additional +1/+1 counter on it if its mana value is 4 or less. otherwise, it enters with three additional +1/+1 counters on it. crew 3'],
    ['this creature enters with an additional +1/+1 counter on it'],
    ['__self__ enters with another +1/+1 counter on it'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['whenever a counter is placed'],
    ['if it has a counter on it'],
    ['for each counter on this permanent'],
    // v0.14.18 — guards: "gets" with a player subject but no counter noun
    // must NOT fire (treasure / emblem / card-draw effects use the same
    // "<player> gets X" frame).
    ['target opponent gets a treasure token'],
    ['each opponent gets an emblem'],
    ['target opponent gets a clue'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
