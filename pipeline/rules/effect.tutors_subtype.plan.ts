// pipeline/rules/effect.tutors_subtype.plan.ts
//
// Standalone Plan tutor rule (The Masters of Evil). Deliberately NOT added to
// THEME_SUBTYPES: the parametric condition.cares_subtype.plan sibling would
// false-positive on every "plan counter" enchantment, and the payoff side is
// already owned by condition.controls_plan. Mirrors the effect.tutors_subtype
// frame for the tutor side only.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutors_subtype.plan',
  axis: 'effect',
  label: 'Tutors a Plan',
  description: 'Searches the library for a Plan card.',
  pairsWith: ['condition.controls_plan'],
  category: 'theme',
};

const PATTERN =
  /search(?:es)?\s+[^.]{0,40}?library for (?:a |an )?[^.]{0,40}?\bplan cards?\b/;

export const rule: Rule = {
  id: 'effect.tutors_subtype.plan',
  axis: 'effect',
  nearMiss: {
    anchors: ['plan'],
    proximity: ['search', 'library'],
    window: 8,
  },
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
