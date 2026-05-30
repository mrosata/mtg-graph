import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_lands';

describe('condition.cares_lands', () => {
  it.each([
    // Lands-you-control payoffs (Blossoming Tortoise, Avenger of Zendikar style)
    ['activated abilities of lands you control cost {1} less to activate'],
    ['for each land you control, put a +1/+1 counter on it'],
    ['land creatures you control get +1/+1'],
    ['if you control four or more lands, draw a card'],
    ['number of lands you control'],
    // Lands in/from graveyard (Splendid Reclamation, Crucible of Worlds style)
    ['return all land cards from your graveyard to the battlefield'],
    ['lands in your graveyard'],
    // Land-subtype framing (Bat Colony, Spelunking, Gargantuan Leech)
    ['whenever a cave you control enters, put a +1/+1 counter on target creature you control'],
    ['this spell costs {1} less to cast for each cave you control and each cave card in your graveyard'],
    ['for each plains you control, put a 1/1 white soldier creature token onto the battlefield'],
    ['number of mountains you control'],
    // v0.14.10 — Regression (Discerning Financier, Claim Jumper,
    // Beza the Bounding Spring, Ticket Tortoise). Catch-up land-count
    // comparison: "if an opponent controls more lands than you ...".
    // The frame gates an effect on opponent vs. own land counts — that's a
    // land-count payoff just like "for each land" / "N or more lands".
    ['at the beginning of your upkeep, if an opponent controls more lands than you, create a treasure token'],
    ['if you control fewer lands than an opponent, draw a card'],
    // Regression (Cactarantula): reversed-word-order "if you control a
    // <subtype>" phrasing. SUBTYPE_PATTERN handles "<subtype> you control"
    // but didn't accept the determiner-first "you control a <subtype>"
    // ordering. OTJ Desert-affinity cost-reduction is a recurring shape.
    ['this spell costs {1} less to cast if you control a desert. reach.'],
    ['if you control a cave, draw a card'],
    ['if you control an island, this creature gets +2/+2 until end of turn'],
    ['this spell costs {2} less if you control two or more deserts'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Tutor — mentions "land card" but doesn't care about lands as a count/class
    ['search your library for a basic land card, reveal it, put it into your hand'],
    // Destroy — mentions land as target but doesn't care about lands
    ['destroy target land'],
    ['exile target land'],
    // Self-animate is `effect.animate_land`, not cares_lands
    ['{2}{r}: this land becomes a 4/4 creature with haste until end of turn'],
    ['draw a card'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
