import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.opus',
  axis: 'condition',
  label: 'Opus',
  description:
    'Ability word triggering on casting an instant or sorcery, with an additional bonus when five or more mana was spent — the big-spell payoff axis.',
  pairsWith: ['effect.cast_noncreature_spell', 'trigger.spell_cast'],
};

const PATTERN = /\bopus\s*—/;

export const rule: Rule = {
  id: 'condition.opus',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['opus'], proximity: ['cast', 'instant', 'sorcery', 'mana', 'five or more'], window: 10 },
};
