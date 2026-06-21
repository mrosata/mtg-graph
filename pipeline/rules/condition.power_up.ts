// pipeline/rules/condition.power_up.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.power_up',
  axis: 'condition',
  label: 'Power-up',
  description:
    'Has the Power-up keyword (once-per-creature activated ability; cheaper the turn it enters).',
  pairsWith: [
    'effect.plus_one_counter',
    'effect.counter_modified',
    'effect.add_mana',
    'effect.has_mana_activated_ability',
  ],
};

// Matches both the keyword ability line ("power-up — {cost}: ...")
// and the cross-reference form ("power-up abilities of other creatures").
// The hyphenated form "power-up" is unique to this MSH mechanic.
const PATTERN = /\bpower-up\b/;

export const rule: Rule = {
  id: 'condition.power_up',
  axis: 'condition',
  nearMiss: {
    anchors: ['power-up'],
    proximity: ['activate', 'counter', 'only once'],
    window: 6,
  },
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
