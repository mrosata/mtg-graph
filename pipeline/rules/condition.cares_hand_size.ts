// pipeline/rules/condition.cares_hand_size.ts
//
// Cards that gate or scale on the count of cards in a hand. Five core
// framings observed across Standard:
//   (1) Hellbent: "have no cards in hand" — boolean gate on empty hand.
//   (2) At-most-1: "one or fewer cards in hand" — Bandit's Talent.
//   (3) Per-card scaling: "for each card in <hand>".
//   (4) Number-of scaling: "the number of cards in <hand>".
//   (5) Threshold count: "N or more cards in <hand>".
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_hand_size',
  axis: 'condition',
  label: 'Cares about hand size',
  description:
    'Gates or scales on the count of cards in a hand. Includes Hellbent (empty hand), at-most-1 ("one or fewer cards in hand"), per-card scaling ("for each card in your hand"), and threshold ("N or more cards in hand") payoffs.',
  // Producers: anything that changes hand size — drawing fills, discarding
  // empties. The same draws_or_discards tag covers both directions.
  pairsWith: ['effect.draws_or_discards'],
};

// v0.35.0 — Batch 15: the player-qualifier alternation now also admits
// `target opponent's|target player's`. Hand-size axis is symmetric —
// whichever player's hand drives the scaling, it's still cares-hand-size.
// Borrowed Knowledge ("cards in target opponent's hand") and similar.
const PATTERNS = [
  // (1) Hellbent: "(you|that player) (has|have) no cards in (your|their|...) hand"
  /\b(?:has|have)\s+no\s+cards?\s+in\s+(?:your|their|a player's|each opponent's|an opponent's|target opponent's|target player's)?\s*hand\b/,
  // (2) At-most-1: "one or fewer cards in <hand>"
  /\bone\s+or\s+fewer\s+cards?\s+in\s+(?:your|their|a player's|each opponent's|an opponent's|target opponent's|target player's)?\s*hand\b/,
  // (3) Per-card scaling: "for each card in <hand>"
  /\bfor\s+each\s+card\s+in\s+(?:your|their|a player's|each opponent's|an opponent's|target opponent's|target player's)\s+hand\b/,
  // (4) Number-of scaling: "(the )?number of cards in <hand>"
  /\b(?:the\s+)?number\s+of\s+cards\s+in\s+(?:your|their|a player's|each opponent's|an opponent's|target opponent's|target player's)\s+hand\b/,
  // (5) Threshold count: "<N> or more cards in <hand>"
  /\b(?:\d+|two|three|four|five|six|seven|eight|nine|ten)\s+or\s+more\s+cards?\s+in\s+(?:your|their|a player's|each opponent's|an opponent's|target opponent's|target player's)?\s*hand\b/,
  // v0.35.0 — Batch 15: relative comparison "an opponent has more cards in
  // hand than you" (Joined Researchers). Symmetric "you have more cards in
  // hand than" reverse-comparison forms also accepted.
  /\b(?:an?\s+(?:opponent|player)|target\s+(?:opponent|player)|you)\s+(?:has|have)\s+more\s+cards?\s+in\s+hand\s+than\s+(?:you|target\s+opponent|each\s+opponent|any\s+opponent)\b/,
];

export const rule: Rule = {
  id: 'condition.cares_hand_size',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['hand'], proximity: ['cards', 'no', 'each', 'number', 'fewer'], window: 6 },
};
