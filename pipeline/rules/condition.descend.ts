// pipeline/rules/condition.descend.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.descend',
  axis: 'condition',
  label: 'Descend',
  description:
    'LCI ability word / gated trigger. Cares about permanent cards entering your graveyard ("you descended if a permanent card was put into your graveyard from anywhere").',
  // The natural producers fill graveyards with permanent cards (mill, self-sac,
  // discard outlets). Pair with effects/triggers that put cards into the
  // graveyard — mill is the cleanest producer, and creature-dies / sacrifice
  // triggers are the second-order producers. Condition-to-condition pairings
  // are excluded by the graph builder (sister tag `condition.celebration` lists
  // effect.create_creature_token / create_token / another_creature_etb).
  pairsWith: ['effect.mill', 'effect.reanimate', 'effect.sacrifice_creature', 'trigger.creature_dies'],
};

// Three frames cover modern descend templating:
//   1. Ability-word form: "descend N —" with optional count (Coati Scavenger).
//   2. Bare ability word: "descend —" with no count.
//   3. Gated-trigger form: "if you descended this turn" (Canonized in Blood,
//      Corpses of the Lost — appears WITHOUT the ability word).
//   4. Keyword variant: "fathomless descent —" (related ability word).
const PATTERNS = [
  /\bdescend(?:\s+\d+)?\s*—/,
  /\bif you descended this turn\b/,
  /\bfathomless descent\s*—/,
  // v0.14.1 — descend scaling without the gating "if". The Mycotyrant: "X is
  // the number of times you descended this turn".
  /\b(?:number of times|each time) you descended this turn\b/,
];

export const rule: Rule = {
  id: 'condition.descend',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['descend', 'descended'], proximity: ['permanent', 'graveyard', 'this turn'], window: 12 },
};
