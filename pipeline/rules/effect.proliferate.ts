// pipeline/rules/effect.proliferate.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.proliferate',
  axis: 'effect',
  label: 'Proliferate',
  description:
    'Triggers or executes the proliferate keyword action (add an additional counter of each kind already on a permanent or player).',
  pairsWith: [
    'condition.cares_plus_one_counter',
    'condition.cares_energy',
    'condition.cares_poison',
  ],
};

export const rule: Rule = {
  id: 'effect.proliferate',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if (card.keywords.includes('Proliferate')) return { evidence: 'Proliferate' };
    const m = normalizedText.match(/\bproliferate\b/);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['proliferate'], proximity: ['counter'], window: 5 },
};
