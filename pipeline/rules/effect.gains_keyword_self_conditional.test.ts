import { describe, it, expect } from 'vitest';
import { rule } from './effect.gains_keyword_self_conditional';

describe('effect.gains_keyword_self_conditional', () => {
  it.each([
    // Didact Echo — descend gating
    ['descend 4 — this creature has flying as long as there are four or more permanent cards in your graveyard.'],
    // __SELF__ form, "as long as"
    ['__self__ has menace as long as you control three or more artifacts.'],
    // "while" gating
    ['__self__ has flying while there is a +1/+1 counter on it.'],
    // "if" gating, paired with stat boost
    ['this creature gets +2/+2 and has flying if you control a swamp.'],
    // Combined "this <type> has <kw>" with as long as
    ['this artifact has flying as long as it is enchanted.'],
    // Regression (Warden of the Inner Sky): "as long as <cond>, it has <kw>"
    // — anaphoric "it" inside a gating clause whose antecedent is __SELF__ /
    // "this creature" mentioned earlier in the same sentence.
    ['as long as this creature has three or more counters on it, it has flying and vigilance.'],
    ['as long as __self__ has a +1/+1 counter on it, it has menace.'],
    // v0.14.28 — Living Conundrum: gate clause + self subject + double-verb
    // bridge ("has 10/10 and has flying"). The Pattern 2 filler needs to
    // bridge the second `has` between the in-clause stat boost and the
    // keyword. Also needs to admit "/" in the filler for "10/10".
    ['as long as there are no cards in your library, this creature has base power and toughness 10/10 and has flying and vigilance.'],
    // v0.21.0 — Fear of the Dark: triggered self-buff that grants menace +
    // deathtouch. Pattern 2's gate-before-subject form already admits "if
    // <gate>, it gains menace ..." — verify it matches.
    ['whenever this creature attacks, if defending player controls no glimmer creatures, it gains menace and deathtouch until end of turn.'],
    // v0.21.0 — Hand That Feeds: "gets +2/+0 and gains menace" — Pattern 2
    // leading verb needs to admit `gets?` followed by `and gains?` continuation.
    ['delirium — whenever this creature attacks while there are four or more card types among cards in your graveyard, it gets +2/+0 and gains menace until end of turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Other-creature anthem — handled by grants_evasion
    ['creatures you control have flying.'],
    // Token creation — handled by grants_evasion
    ['create a 1/1 white spirit creature token with flying.'],
    // Bare grant without self anchor
    ['target creature gains flying until end of turn.'],
    // Cares-about — handled by condition.cares_evasion
    ['creatures with flying you control get +1/+1.'],
    // Unrelated keyword
    ['this creature has trample as long as you control four lands.'],
    // Plain prose
    ['draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
