// pipeline/rules/effect.loses_abilities.ts
//
// "Loses all abilities" / "has no abilities" — silencer removal answer.
// Distinct from counterspells (which counter the spell/ability before
// resolution) and from "loses <specific keyword>" effects (which target
// one keyword, not the entire ability suite). The Witness Protection /
// Song of the Dryads / Pacifism-adjacent removal family.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.loses_abilities',
  axis: 'effect',
  label: 'Strips abilities',
  description:
    'Causes a permanent (or all of a category) to lose all abilities — silencer removal that neutralizes activated/triggered abilities without destroying the permanent.',
  // No natural producer pairings — this is an "answer" axis, not a synergy
  // enabler.
  pairsWith: [],
};

const PATTERNS = [
  // "<subject> loses all abilities" / "<subject> lose all abilities" (plural)
  /\b(?:loses?|lose)\s+all\s+abilities\b/,
  // "<subject> has no abilities" / "<subject> have no abilities"
  /\b(?:has|have)\s+no\s+abilities\b/,
];

export const rule: Rule = {
  id: 'effect.loses_abilities',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['abilities'], proximity: ['loses', 'lose', 'no', 'all'], window: 4 },
};
