// pipeline/rules/effect.animate_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.animate_land',
  axis: 'effect',
  label: 'Animates a land into a creature',
  description: 'Turns a land into a creature ("target land becomes a N/N creature"). Distinct from effect.is_manland (intrinsic). Living Lands / Awaken / Brave the Wilds family.',
  pairsWith: ['condition.cares_lands'],
};

// "target land [...] becomes a N/N [...] creature" — non-self land animation.
// The structure is: "land" then optional filler (e.g. "you control") then
// "becomes a N/N ... creature". Distinguished from `effect.is_manland` (which
// uses __self__ self-reference OR "this land becomes" templating). The
// `(?<!this )` lookbehind right before `lands?` rejects the manland self-
// animation form ("this land becomes a 2/2 ..."), which belongs to
// `effect.is_manland` — the Restless cycle (Bivouac, Cottage, Vinestalk, etc.)
// all use this phrasing.
const PATTERN =
  /\b(?:target |another |each )?(?<!this )lands?\s+(?:[^.]{0,40}?\s+)?becomes?\s+(?:a |an )?\d+\/\d+\s+[^.]{0,30}?creature\b/;

// v0.14.1 — Pronoun-form animation. Tendril of the Mycotyrant: "put seven
// +1/+1 counters on target noncreature land you control. It becomes a 0/0
// Fungus creature with haste." The "It" refers back to the prior-clause
// "target ... land". Anchor on "target ... land[\.\s]+...it becomes a N/N
// ... creature" within a bounded window so the pronoun resolution stays
// within the same effect block.
const PRONOUN_PATTERN =
  /\btarget [^.]{0,60}?lands?[^.]*\.\s*it becomes? (?:a |an )?\d+\/\d+\s+[^.]{0,30}?creature\b/;

export const rule: Rule = {
  id: 'effect.animate_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PRONOUN_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['becomes', 'creature'], proximity: ['land', 'target'], window: 8 },
};
