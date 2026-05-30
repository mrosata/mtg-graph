// pipeline/rules/effect.unsuspect.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.unsuspect',
  axis: 'effect',
  label: 'Clear suspect',
  description:
    'Removes the suspect status from a creature ("is/are no longer suspected", "becomes no longer suspected"). Counter-play and payoff for `condition.cares_suspected`.',
  pairsWith: ['condition.cares_suspected'],
};

// One frame: subject + "no longer suspected". Subject is one of:
//   is | are | it's | they're | become | becomes
// The leading \b anchors the subject word; the trailing \b anchors after
// "suspected".
const PATTERN = /\b(?:is|are|it's|they're|become|becomes) no longer suspected\b/;

export const rule: Rule = {
  id: 'effect.unsuspect',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['no longer suspected'],
    proximity: ['is', 'are', "it's", "they're", 'become'],
    window: 4,
  },
};
