// pipeline/rules/effect.create_clue.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.create_clue',
  axis: 'effect',
  label: 'Creates Clue tokens',
  description: 'Creates one or more Clue tokens.',
  pairsWith: ['trigger.token_created', 'condition.cares_subtype.clue'],
};

// Three forms:
//   1. Direct "create [N] [tapped] clue token(s)".
//   2. "Create your choice of ..., a clue token, ..." — multi-token-list form where
//      the produced token is one option in a create-list. Anchored on "create"
//      followed (within ~80 chars / no period) by "clue token".
//   3. Bare keyword "investigate" — reminder text is stripped pre-tag, so cards
//      like Auspicious Arrival that use the keyword action without spelling out
//      "create a clue token" must be caught here.
const PATTERNS = [
  /\bcreates?\s+(?:a|an|\d+|x|one|two|three|four|five)\s+(?:tapped\s+)?clue\s+tokens?\b/,
  /\bcreates?\s+[^.]{0,80}?\bclue\s+tokens?\b/,
  /\binvestigates?\b/,
  // v0.14.6 — Anointed-Procession-style replacement frame (Case of the
  // Pilfered Proof): "those tokens plus a Clue token are created instead".
  // The verb is "are created", not "create".
  /\bclue\s+tokens?\s+(?:are|is)\s+created\b/,
  // v0.38.0 — Batch 5: multi-subtype token-list template. Academy
  // Manufactor: "create a clue, food, or treasure token".
  /\bcreates?\s+[^.]{0,60}?\bclue(?:,\s+\w+){0,3}(?:,?\s+(?:or|and)\s+\w+)?\s+tokens?\b/,
];

export const rule: Rule = {
  id: 'effect.create_clue',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['clue', 'investigate'], proximity: ['create', 'token'], window: 5 },
};
