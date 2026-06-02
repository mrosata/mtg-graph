// pipeline/rules/effect.surveil.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.surveil',
  axis: 'effect',
  label: 'Surveil',
  description: 'Surveils 1 or more — mills the cards put on bottom.',
  pairsWith: ['condition.cares_graveyard'],
};

const PATTERN = /\bsurveil (?:\d+|x)\b/;

export const rule: Rule = {
  id: 'effect.surveil',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
