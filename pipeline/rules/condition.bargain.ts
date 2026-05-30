// pipeline/rules/condition.bargain.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.bargain',
  axis: 'condition',
  label: 'Bargain',
  description: 'Has the Bargain keyword (sacrifice as alternative cost).',
  pairsWith: [
    'effect.create_token',
    'effect.create_treasure',
    'effect.create_food',
    'effect.create_clue',
  ],
};

// Simple keyword-presence check. Matches both the keyword line ("bargain")
// and the in-text cross-reference ("if this spell was bargained, ..."). The
// word "bargain" does not appear in unrelated Magic vocabulary, so a bare
// boundary match is sufficient.
const PATTERN = /\bbargain/;

export const rule: Rule = {
  id: 'condition.bargain',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
