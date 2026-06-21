import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.controls_plan',
  axis: 'condition',
  label: 'Cares about Plans',
  description:
    'References controlling a Plan enchantment (Enchantment — Plan subtype). Example: Doctor Doom.',
  pairsWith: [],
};

// Matches "a plan" only in control/condition contexts. Negative lookbehind
// ensures it's NOT preceded by "for" (tutor/search context). Negative lookahead
// blocks "a plan counter". Example match: "control ... a plan" (Doctor Doom).
// Example non-match: "search for a plan card" (The Masters of Evil - tutors, not payoff).
const PATTERN = /(?<!for\s)\ba plan\b(?!\s+counter)/;

export const rule: Rule = {
  id: 'condition.controls_plan',
  axis: 'condition',
  nearMiss: {
    anchors: ['plan'],
    proximity: ['control', 'enchantment', 'counter'],
    window: 6,
  },
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
