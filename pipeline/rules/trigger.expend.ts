// pipeline/rules/trigger.expend.ts
//
// Bloomburrow mechanic. "Whenever you expend N, …" fires when the controller
// has cumulatively spent N total mana casting spells in the current turn. A
// once-per-turn trigger, not per-cast. Cards with expend exist at N=4, 6,
// and 8 across the BLB color cycle and a few set-following reprints.
//
// The reminder text "(You expend N as you spend your Nth total mana to cast
// spells during a turn.)" is stripped pre-tagging, so the rule only sees
// the literal trigger line.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.expend',
  axis: 'trigger',
  label: 'Triggers on expend',
  description:
    'Has an ability that triggers when you expend N (cumulatively spend N total mana casting spells in a turn). Bloomburrow mechanic.',
  // Producers: anything that helps generate the mana to be spent. Ramp and
  // mana-add effects are the natural enablers; expanding to spell-cast
  // triggers would be too noisy since expend counts *any* spell.
  pairsWith: ['effect.add_mana', 'effect.ramp_nonland'],
};

const PATTERN = /\bwhenever you expend \d+\b/;

export const rule: Rule = {
  id: 'trigger.expend',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['expend'], proximity: ['whenever', 'you'], window: 4 },
};
