import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.infusion',
  axis: 'condition',
  label: 'Infusion',
  description:
    'Ability word gating an additional effect on a separately-tracked condition (typically lifegain, but the rule is keyword-anchored so it generalizes across the family).',
  pairsWith: ['effect.life_changed'],
};

const PATTERN = /\binfusion\s*—/;

export const rule: Rule = {
  id: 'condition.infusion',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['infusion'], proximity: ['if', 'gained', 'life', 'this turn'], window: 10 },
};
