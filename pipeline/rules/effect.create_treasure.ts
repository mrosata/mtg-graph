// pipeline/rules/effect.create_treasure.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.create_treasure',
  axis: 'effect',
  label: 'Creates Treasure tokens',
  description: 'Creates one or more Treasure tokens.',
  pairsWith: ['trigger.token_created', 'condition.cares_subtype.treasure'],
};

// Same shape as effect.create_clue / effect.create_food: direct count-prefixed
// form plus a looser multi-token-list form ("create your choice of ..., a
// treasure token, ...").
const PATTERNS = [
  /\bcreates?\s+(?:a|an|\d+|x|one|two|three|four|five)\s+(?:tapped\s+)?treasure\s+tokens?\b/,
  /\bcreates?\s+[^.]{0,80}?\btreasure\s+tokens?\b/,
];

export const rule: Rule = {
  id: 'effect.create_treasure',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['treasure'], proximity: ['create', 'token'], window: 5 },
};
