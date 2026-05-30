// pipeline/rules/condition.cares_bending.ts
//
// "Whenever you waterbend, earthbend, firebend, or airbend, ...". The payoff
// half of the Avatar bending mechanic family. Currently only Avatar Aang
// fires this in Standard, but the slot is here so any future "bending
// matters" card automatically edges to the 82 bending sources.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_bending',
  axis: 'condition',
  label: 'Cares about bending',
  description: 'Triggers or scales on any bending action (water/earth/fire/air) being performed.',
  pairsWith: ['effect.has_waterbend', 'effect.has_earthbend', 'effect.has_firebending', 'effect.has_airbend'],
  category: 'theme',
};

const PATTERNS = [
  /\bwhenever you (?:water|earth|fire|air)bend/,
  /\bif you'?ve (?:water|earth|fire|air)bent\b/,
  /\bdone all four (?:this turn|of)\b/,
];

export const rule: Rule = {
  id: 'condition.cares_bending',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['bend', 'bending'], proximity: ['whenever', 'you', 'four'], window: 6 },
};
