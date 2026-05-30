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
const PATTERNS = [
  /(?<!total\s)\bmana value (?:is\s+)?[1-4]\s*or less\b/,
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
