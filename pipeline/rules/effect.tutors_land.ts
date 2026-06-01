// pipeline/rules/effect.tutors_land.ts
//
// "Search your library for a land card" — UNRESTRICTED land tutor. The
// Expedition Map / Sylvan Scrying / Crop Rotation family. Distinct from:
// - `effect.tutors_basic_land` (basic-only — "basic land card" / typed basics
//   / "land card with a basic land type").
// - `effect.ramp_nonland` (basics-into-play ramp).
// This rule fires on the literal "a land card" form without a preceding
// "basic" qualifier, so it cleanly excludes the basic-tutor family.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutors_land',
  axis: 'effect',
  label: 'Tutors a land',
  description:
    'Searches library for a land card (no basic-restriction). Expedition Map / Sylvan Scrying / Crop Rotation family — distinct from `effect.tutors_basic_land` (basic-only) and `effect.ramp_nonland` (basic-into-play).',
  pairsWith: ['condition.cares_lands'],
  category: 'theme',
};

// Match "search ... library for a land card" — but require the noun phrase
// immediately preceding "land card" to NOT be "basic" (handled by negative
// lookbehind on "basic "). Also exclude the "land card with a basic land type"
// form which is the basic-land axis (Nervous Gardener). The "with a basic
// land type" disqualifier is enforced via a NEGATIVE LOOKAHEAD on the trailing
// clause.
const PATTERN = /\bsearch [\w\s']+? library for a land cards?\b(?! with a basic land type)(?<!\bbasic land cards?\b)/;

export const rule: Rule = {
  id: 'effect.tutors_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['search', 'land'], proximity: ['library', 'card'], window: 8 },
};
