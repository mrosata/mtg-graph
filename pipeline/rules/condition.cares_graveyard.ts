// pipeline/rules/condition.cares_graveyard.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_graveyard',
  axis: 'condition',
  label: 'Cares about graveyard',
  description: 'Triggers or scales off graveyard size or content.',
  pairsWith: ['effect.mill', 'effect.reanimate'],
};

// FIX 13 (BR-8) — Consuming Aberration: "number of cards in your opponents'
// graveyards" — the possessive plural `opponents'` introduces an apostrophe
// inside the filler between `in` and `graveyards?`. Extend the inner filler
// char class `[\w\s]` → `[\w\s']` everywhere it appears immediately before
// `graveyards?` so possessive owner phrases are admitted.
const PATTERNS = [
  // "for each card in [a/your/all] graveyard(s)" — graveyard-size scaling.
  // v0.19 — optional possessive between "cards?" and "in" (Huskburster
  // Swarm: "for each creature card you own in exile and in your graveyard").
  // The Cosmogoyf / Slime Against Humanity-style "you own / you control /
  // owned by you" qualifier is a common Bloomburrow / OTJ templating.
  /\bfor each (?:[\w\s\-]+? )?cards? (?:you own |you control |owned by you )?in [\w\s']+?graveyards?\b/,
  // "number of [type] cards in [a/your/all] graveyard(s)"
  /\bnumber of (?:[\w\s\-]+? )?cards? in [\w\s']+?graveyards?\b/,
  // v0.39.0 — 200-card audit Ship 11 (Batch 2): Pattern 3 DROPPED. The
  // old broad pattern (`\bcards? in (?:your |...)?graveyards?\b`) was the
  // widest matcher and over-fired on producer-frame target qualifiers:
  // Animate Dead enchant clause ("enchant creature card in a graveyard"),
  // Archmage's Newt producer ("target instant or sorcery card in your
  // graveyard gains flashback"). Genuine scaling/threshold/for-each
  // payoffs are covered by Patterns 1 (for each), 2 (number of), and 4
  // (if there are N or more) — those all require a payoff-frame
  // antecedent before "card(s) in graveyard". The bare phrase alone is
  // a producer/zone reference, not a graveyard-care payoff.
  // "if there are [N or more] cards in [a/your] graveyard"
  // v0.39.0 — 200-card audit Ship 11 (Batch 2): admit `as long as there
  // are` / `while there are` alongside `if there are`. The dropped Pattern
  // 3 used to catch these via the bare "cards in your graveyard" leak;
  // now they need a payoff-frame antecedent.
  /\b(?:if|as long as|while|when|whenever) there are (?:[\d]+ or more |[\w\s\-]+ )?cards? in [\w\s']+?graveyards?\b/,
  // "whenever a [type] card is put into a graveyard"
  /\bwhenever (?:a |an |another )?(?:[\w\-]+ )?card is put into [\w\s']+?graveyards?\b/,
  // v0.14.7 — cast-from-graveyard as a graveyard-cares reference. Casting
  // out of a graveyard uses graveyard contents as a resource — distinct
  // from removal effects like "exile target card from a graveyard" (which
  // remain in the negative-match set) because the verb is `cast`.
  // Flotsam // Jetsam: "cast a spell from each opponent's graveyard".
  // Tarrian's Journal-style: "cast this card from your graveyard".
  /\bcast\s+(?:[\w\-' ]+? )?from\s+(?:your|each opponent's|each player's|an opponent's|target opponent's|a)\s+graveyards?\b/,
];

export const rule: Rule = {
  id: 'condition.cares_graveyard',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['graveyard', 'graveyards'], proximity: ['cards', 'number'], window: 6 },
};
