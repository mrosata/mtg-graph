// pipeline/rules/condition.cares_warped.ts
//
// Cares-about-warp axis. Companion to `effect.has_warp` (the keyword flag on
// the warp-cost half). Fires on body references that scale or gate on warped
// spells / warped cards / warp-cast triggers.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_warped',
  axis: 'condition',
  label: 'Cares about warp',
  description:
    'References warped spells, warped cards, or the warp keyword as a payoff. Pairs with `effect.has_warp` producers.',
  pairsWith: ['effect.has_warp'],
  category: 'theme',
};

const PATTERNS = [
  // "a spell was warped this turn" — the Void-cycle scaling clause.
  /\bspells?\s+(?:was|were)\s+warped\b/,
  // "warped creature card" / "warped permanent card" / "warped card" — Close
  // Encounter family (cares-about-warp-state cards in exile).
  /\bwarped\s+(?:[\w\-]+\s+){0,3}cards?\b/,
  // "exiled card with warp" — Blade of the Swarm (warp-pile filter).
  /\bwith warp\b/,
  // "if that creature was cast for its warp cost" — Full Bore payoff.
  /\bwarp cost\b/,
];

export const rule: Rule = {
  id: 'condition.cares_warped',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['warped', 'warp'], proximity: ['spell', 'card', 'cost', 'cast'], window: 6 },
};
