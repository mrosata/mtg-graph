// pipeline/rules/effect.tutors_artifact.ts
//
// "Search your library for an artifact card." The middle ground between
// `effect.tutor_any` (any card) and the parametric `effect.tutors_subtype.*`
// (specific Equipment/Treasure/etc.). Hoarding Dragon, Trinket Mage,
// Whir of Invention-style toolbox tutors live here.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tutors_artifact',
  axis: 'effect',
  label: 'Tutors an artifact card',
  description:
    'Searches library for an artifact card (any artifact — not subtype-restricted).',
  pairsWith: [],
  category: 'theme',
};

// "search [your|target opponent's]? library for [optional clause]? artifact card"
const PATTERN = /search [\w\s']+? library for [\w\s,'-]{0,60}?\bartifact card\b/;
// Hybrid "A or B card" sharing trailing noun — "an artifact or enchantment card",
// "a creature or artifact card".
const PATTERN_HYBRID = /search [\w\s']+? library for [\w\s,'-]{0,40}?\bartifact or [\w\s\-]{1,30}? cards?\b/;
const PATTERN_HYBRID_2 = /search [\w\s']+? library for [\w\s,'-]{0,40}?\b[\w\s\-]{1,30}? or artifact cards?\b/;

export const rule: Rule = {
  id: 'effect.tutors_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_HYBRID) ?? t.match(PATTERN_HYBRID_2);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['search', 'artifact'], proximity: ['library', 'card'], window: 8 },
};
