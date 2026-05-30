// pipeline/rules/effect.tutor_any.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutor_any',
  axis: 'effect',
  label: 'Tutors any card',
  description: 'Searches library for any card (no subtype restriction — distinct from effect.tutors_subtype.*).',
  pairsWith: [],
};

// Match "search [...] library for a/an/any card" with NOTHING between the
// determiner ("a"/"an"/"any") and "card". This deliberately excludes type-
// or subtype-restricted tutors (e.g. "for a creature card", "for a basic land
// card", "for an artifact card") — those carry their own subtype-tutor tags.
// Word boundary after "card" prevents bleed into "cards" (multi-card tutors
// are a different effect family).
const PATTERN = /\bsearch [\w\s]+? library for (?:an? |any )card\b/;

export const rule: Rule = {
  id: 'effect.tutor_any',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['search'], proximity: ['library', 'card'], window: 8 },
};
