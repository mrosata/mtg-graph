// pipeline/rules/effect.targeted_discard.ts
//
// Hand-attack family: makes a targeted opponent discard. Distinct from
// `effect.draws_or_discards`, which is the looter axis (self-discard for
// card selection / madness / graveyard fuel). Hand-attack is disruption —
// Duress, Thoughtseize, Mind Rot, Ego Drain.
//
// Two main shapes:
//   1. Direct discard: "target (player|opponent) discards N card(s)"
//   2. Reveal + choose + that-player-discards: "target opponent reveals
//      their hand. you choose ... that player discards that card."
//
// Both feed graveyards on the opponent's side and pair with graveyard-
// matters cards that gain advantage from increased opponent graveyard size
// (mill-adjacent payoffs), as well as with cards that empty their own hand.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.targeted_discard',
  axis: 'effect',
  label: 'Hand attack / targeted discard',
  description: 'Forces a targeted opponent (or each opponent) to discard. The hand-attack disruption family — distinct from self-discard/looting effects.',
  pairsWith: ['condition.cares_graveyard', 'trigger.card_drawn_discarded'],
};

const PATTERNS = [
  // Mind Rot shape: "target (player|opponent) discards ..."
  /\btarget (?:player|opponent) discards?\b/,
  // Each-opponent variant. Also accepts the punisher template "each opponent
  // may discard a card or ..." (Zoyowa Lava-Tongue, Rack/Wrench-family).
  /\beach opponent (?:may )?discards?\b/,
  // "Each player" symmetric variant (Rankle's Prank). The caster also discards,
  // but the OPPONENT discards too — the disruption axis is still served.
  /\beach player discards?\b/,
  // Thoughtseize shape: the "reveal ... that player discards that card" pair
  // produces the unique "that player discards" phrasing — a strong anchor.
  /\bthat player discards that card\b/,
  // v0.14.1 — exile-from-hand hand-disruption (Skullcap Snail). Functionally
  // equivalent to discard for graph-edge purposes: an opponent's hand loses
  // a card.
  /\btarget opponent exiles (?:a|an|one|two|three|x|\d+) cards? from their hand\b/,
];

export const rule: Rule = {
  id: 'effect.targeted_discard',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['discards', 'discard'], proximity: ['opponent', 'player', 'target'], window: 6 },
};
