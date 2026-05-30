// pipeline/rules/trigger.life_changed.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.life_changed',
  axis: 'trigger',
  label: 'Triggers on life total change',
  description: 'Triggers when a player gains or loses life.',
  pairsWith: ['effect.life_changed', 'effect.deals_damage'],
};

export const rule: Rule = {
  id: 'trigger.life_changed',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(/whenever (?:you|an opponent|a player) (?:gains?|loses?) life/);
    return m ? { evidence: m[0] } : false;
  },
};
