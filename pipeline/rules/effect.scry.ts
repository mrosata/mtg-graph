// pipeline/rules/effect.scry.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.scry',
  axis: 'effect',
  label: 'Scry',
  description: 'Scries 1 or more — pure library-top selection.',
  pairsWith: [],
};

const PATTERN = /\bscry \d+\b/;

export const rule: Rule = {
  id: 'effect.scry',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
