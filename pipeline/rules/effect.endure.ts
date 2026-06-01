// pipeline/rules/effect.endure.ts
//
// Endure keyword action (DSK) — "endures N" means put N +1/+1 counters on the
// subject OR create an N/N white Spirit creature token. The keyword's full
// payload lives in reminder text (stripped before tagging), so a card whose
// only meaningful body is `endures N` would otherwise end up with no effect
// tag at all. This rule fires off the body anchor, which survives normalization.
//
// Implicit producer of BOTH +1/+1 counters and Spirit tokens.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.endure',
  axis: 'effect',
  label: 'Endure',
  description:
    'Endure keyword action — put N +1/+1 counters on a creature OR create an N/N white Spirit token. Implicit +1/+1-counter and Spirit-token producer (the choice is decided at resolution; the graph counts it as both).',
  pairsWith: ['condition.cares_plus_one_counter', 'condition.cares_tribe.spirit'],
};

// Body anchor that survives normalization. The verb takes a numeric argument
// (`endures 1` through `endures 3` in current Standard) or `endures X`.
const PATTERN = /\bendures?\s+(?:\d+|x)\b/;

export const rule: Rule = {
  id: 'effect.endure',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['endure', 'endures'], proximity: ['spirit', '+1/+1', 'counter'], window: 8 },
};
