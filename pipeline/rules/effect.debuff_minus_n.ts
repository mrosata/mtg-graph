// pipeline/rules/effect.debuff_minus_n.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.debuff_minus_n',
  axis: 'effect',
  label: 'Applies a -N/-N debuff',
  description:
    'Gives a creature -N/-N until end of turn (can kill via toughness ≤ 0).',
  pairsWith: ['trigger.creature_dies'],
};

// "-N/-N" where the power side is a positive integer (so it's a real debuff),
// and the toughness side is any non-negative integer (so "-N/-0" power-only
// debuffs like Cogwork Wrestler also count). Also "-X/-X". The "/-" is
// anchored to "-" on both sides so "+1/-1" (asymmetric pump) is not matched.
// Exclude "-0/-0" by requiring the first digit to be 1-9 or X.
const PATTERN = /(?:^|[\s(])-(?:[1-9]\d*\/-\d+|x\/-x)\b/;

export const rule: Rule = {
  id: 'effect.debuff_minus_n',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['gets', 'get'], proximity: ['-'], window: 4 },
};
