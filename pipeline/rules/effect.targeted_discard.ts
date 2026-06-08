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
  // v0.14.39 — modern Thoughtseize templating uses the bound pronoun "they
  // discard it" after a "target opponent reveals their hand" antecedent
  // (Binding Negotiation, plus future cards adopting the pattern). Span-aware
  // anchor: require both clauses in the same effect block (≤200 chars
  // between them) so "they" can't bind to something unrelated.
  /\btarget opponent reveals their hand\b[\s\S]{0,200}?\bthey discards?\s+(?:it|that card|those cards|the chosen card)\b/,
  // v0.14.40 — plural-subject multi-opponent template "any number of target
  // opponents each discard a card" (Hollow Marauder). The plural noun
  // `opponents` + distributive `each` + plural verb `discard` (no s)
  // defeats the singular `target opponent discards` anchor. Same axis: each
  // opponent in the targeted set loses a card from hand.
  // v0.35.0 — Batch 17: also admit `players` (singular `player` is
  // targetable too — Ral Zarek, Guest Lecturer: "Any number of target
  // players each discard a card").
  /\b(?:any number of )?target (?:opponents|players) each discards?\b/,
  // Bound-pronoun distributive variant: "each of those opponents discards
  // a card" — refers back to the targeted set above and forces each
  // member to discard. Same disruption semantic.
  /\beach of those opponents discards?\b/,
  // v0.20.0 — Thought-Stalker Warlock template: "choose target opponent
  // ... they discard <a card | that card | the chosen card>". The
  // antecedent gate (within 200 chars) binds "they" to the chosen
  // opponent without admitting bare "they discard".
  /\bchoose target opponent\b[\s\S]{0,200}?\bthey discards?\s+(?:a card|that card|the chosen card)\b/,
  // v0.38.0 — Batch 12d: Thoughtseize-shape exile. Aggressive Negotiations:
  // "target opponent reveals their hand. you choose a nonland card from
  // it and exile that card". Same hand-attack semantic as discard — the
  // chosen card leaves the opponent's hand. Spanned by the same 200-char
  // antecedent gate as the existing reveal-then-discard arms.
  /\btarget opponent reveals their hand\b[\s\S]{0,200}?\byou choose [^.]*?\bexile that card\b/,
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
