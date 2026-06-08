// pipeline/rules/effect.create_food.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.create_food',
  axis: 'effect',
  label: 'Creates Food tokens',
  description: 'Creates one or more Food tokens.',
  pairsWith: ['trigger.token_created', 'condition.cares_subtype.food'],
};

// Same shape as effect.create_clue: direct count-prefixed form plus a looser
// multi-token-list form ("create your choice of ..., a food token, ...").
const PATTERNS = [
  /\bcreates?\s+(?:a|an|\d+|x|one|two|three|four|five)\s+(?:tapped\s+)?food\s+tokens?\b/,
  /\bcreates?\s+[^.]{0,80}?\bfood\s+tokens?\b/,
  // v0.38.0 — Batch 5: multi-subtype token-list template. Academy
  // Manufactor: "create a clue, food, or treasure token".
  /\bcreates?\s+[^.]{0,60}?\bfood(?:,\s+\w+){0,3}(?:,?\s+(?:or|and)\s+\w+)?\s+tokens?\b/,
];

export const rule: Rule = {
  id: 'effect.create_food',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['food'], proximity: ['create', 'token'], window: 5 },
};
