// pipeline/rules/condition.cares_low_mana_value.ts
//
// Cards that gate on the mana value of a target spell or permanent being
// LOW — the canonical "small removal" axis. Feed the Cauldron, Cut Down,
// Cast Down, Bloodtithe Harvester's deal-2 clause, counter-target-mv-2-or-
// less spells. Symmetric to `condition.cares_high_mana_value`.
//
// Pairs with the typical "answers" that operate on the low end: removal
// (destroy/exile/counter), bounce, and pacify.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_low_mana_value',
  axis: 'condition',
  label: 'Cares about low mana value',
  description:
    'Triggers, scales, or gates on a spell or permanent with mana value N or less (N <= 4). The "small removal" / "cheap-spell payoff" axis.',
  pairsWith: [
    'effect.destroy_creature',
    'effect.counterspell',
    'effect.exile_creature',
    'effect.bounce_creature',
    'effect.pacify',
  ],
  category: 'theme',
};

// Match "mana value N or less" where N is 1-4. Higher thresholds (5+) are
// rare and tend to appear in collect-evidence / library-search contexts
// rather than removal payoffs.
//
// Exclusion: "total mana value" — used in collect-evidence-style mechanics
// over a pile, structurally different. Skip via negative lookbehind.
//
// v0.14.10 — admit verb-bearing variant "mana value IS N or less" via
// optional `is\s+` arm. Same semantic; covers Beseech the Mirror,
// Soul Search, Guidelight Pathmaker, Thunderous Velocipede.
// v0.35.0 — Batch 10: also admit `was` (past tense, trigger-aftermath
// conditions like Tainted Treats "if its mana value was 4 or less") and
// `x` as a placeholder in the count slot (variable-X spells like Vicious
// Rivalry "with mana value X or less" and Mind into Matter "with mana
// value X or less"). The X-as-count form is unambiguously low-MV scope
// because the spell itself has X in its cost.
const PATTERNS = [
  /(?<!total\s)\bmana value (?:is\s+|was\s+)?(?:[1-4]|x)\s*or less\b(?![^.]*,?\s*where x is)/,
  // v0.30 Group 7 — count-comparator: "mana value (is)? less than or equal
  // to the number/amount" / "≤ the number/amount/x" (Quag Feast).
  // Dynamic ceiling — still a low-MV gate axis. Per ship list tiebreaker,
  // bare "mana value N" is NOT admitted (would flip an existing negative).
  /\bmana value (?:is\s+)?(?:less than or equal to|≤)\s+(?:the\s+(?:number|amount)|x)\b/,
];

export const rule: Rule = {
  id: 'condition.cares_low_mana_value',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['mana value'], proximity: ['less', 'destroy', 'counter', 'exile'], window: 8 },
};
