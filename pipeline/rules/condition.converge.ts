import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.converge',
  axis: 'condition',
  label: 'Converge',
  description:
    'Khans-era ability word. Scales an effect on "the number of colors of mana spent to cast it" — the multicolor-mana payoff axis.',
  pairsWith: ['effect.plus_one_counter'],
};

const PATTERN = /\bconverge\s*—/;

export const rule: Rule = {
  id: 'condition.converge',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['converge'], proximity: ['color', 'mana', 'spent'], window: 8 },
};
