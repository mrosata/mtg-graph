// pipeline/rules/condition.cares_high_mana_value.ts
//
// Cards that trigger, scale, or gate on the mana value of a spell — typically
// "with mana value N or greater/more" for N >= 4. Cornerstone of ramp/Tron/big-
// mana archetypes: Up the Beanstalk, Spider Manifestation, Skybeast Tracker
// etc. all key off this clause.
//
// Pairs with `effect.ramp_nonland` because the ramp → big-spell payoff archetype
// is the canonical combo.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_high_mana_value',
  axis: 'condition',
  label: 'Cares about high mana value',
  description:
    'Triggers, scales, or gates on a spell with mana value N or greater (N >= 4). The "big-spell payoff" half of the ramp archetype.',
  pairsWith: ['effect.ramp_nonland'],
  category: 'theme',
};

// Match "mana value N or greater/more" where N is 4-9. Lower thresholds (1-3)
// are too permissive — almost every card in the format clears them — and tend
// to appear in cost-reduction / removal clauses rather than payoffs.
//
// Exclusion: "total mana value" appears in collect-evidence-style mechanics
// and is structurally different (sum over a pile, not per-spell), so we skip.
const PATTERNS = [
  /(?<!total\s)\bmana value [4-9]\+?\s*or (?:greater|more)\b/,
];

export const rule: Rule = {
  id: 'condition.cares_high_mana_value',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['mana value'], proximity: ['greater', 'more', 'cast'], window: 8 },
};
