// pipeline/rules/effect.create_map.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.create_map',
  axis: 'effect',
  label: 'Creates Map tokens',
  description: 'Creates one or more Map tokens (LCI artifact token with a Scry-and-explore activation).',
  pairsWith: ['trigger.token_created'],
};

// Mirrors `effect.create_clue` shape:
//   1. Direct "create [N] [tapped] map token(s)".
//   2. "Create your choice of ..., a map token, ..." — multi-token-list form
//      where the produced token is one option in a create-list. Anchored on
//      "create" followed (within ~80 chars / no period) by "map token".
const PATTERNS = [
  /\bcreates?\s+(?:a|an|\d+|x|one|two|three|four|five)\s+(?:tapped\s+)?map\s+tokens?\b/,
  /\bcreates?\s+[^.]{0,80}?\bmap\s+tokens?\b/,
];

export const rule: Rule = {
  id: 'effect.create_map',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['map'], proximity: ['create', 'token'], window: 5 },
};
