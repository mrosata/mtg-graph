// pipeline/rules/trigger.counter_changed.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.counter_changed',
  axis: 'trigger',
  label: 'Triggers on counter change',
  description: 'Triggers when counters are placed on or removed from a permanent.',
  pairsWith: ['effect.counter_modified', 'effect.plus_one_counter'],
};

export const rule: Rule = {
  id: 'trigger.counter_changed',
  axis: 'trigger',
  match: (t) => {
    const re =
      /whenever (?:[\w\s/+\-]+? )?counters? (?:is |are )?(?:put|placed|removed)/;
    const alt = /whenever (?:you|a player) puts? (?:a |an |one or more )?counters?/;
    const m = t.match(re) || t.match(alt);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['counter', 'counters'], proximity: ['whenever'], window: 8 },
};
