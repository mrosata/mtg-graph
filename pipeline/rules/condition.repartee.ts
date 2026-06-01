import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.repartee',
  axis: 'condition',
  label: 'Repartee',
  description:
    'DSK-era ability word. Triggers when you cast an instant or sorcery spell that targets a creature — the magecraft-meets-targeted-spell axis.',
  pairsWith: ['effect.cast_noncreature_spell', 'trigger.spell_cast'],
};

const PATTERN = /\brepartee\s*—/;

export const rule: Rule = {
  id: 'condition.repartee',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['repartee'], proximity: ['cast', 'instant', 'sorcery', 'target', 'creature'], window: 10 },
};
