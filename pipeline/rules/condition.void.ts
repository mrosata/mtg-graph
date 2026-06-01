import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.void',
  axis: 'condition',
  label: 'Void',
  description:
    'EOE-era ability word. Gates an effect on "a nonland permanent left the battlefield this turn or a spell was warped this turn" — the LTB + warp payoff axis.',
  pairsWith: ['trigger.permanent_leaves_battlefield', 'effect.has_warp'],
};

const PATTERN = /\bvoid\s*—/;

export const rule: Rule = {
  id: 'condition.void',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['void'], proximity: ['nonland', 'permanent', 'left', 'battlefield', 'warped'], window: 12 },
};
