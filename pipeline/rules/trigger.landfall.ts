// pipeline/rules/trigger.landfall.ts
//
// Land-ETB trigger. Phrased "when(ever) a land you control enters" in modern
// templating, or "landfall —" as an ability word. Distinct from
// `trigger.land_leaves_battlefield` (LTB) and from `condition.cares_lands`
// (count/threshold gates). Pairs naturally with ramp, token producers, and
// land-care payoffs.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.landfall',
  axis: 'trigger',
  label: 'Triggers on land entering the battlefield',
  description: 'Has an ability that triggers when a land (yours or any) enters the battlefield — the landfall axis.',
  pairsWith: [
    'condition.cares_lands',
    'effect.ramp_nonland',
    'effect.create_creature_token',
  ],
};

// Three frames cover modern landfall templating:
//   1. Ability-word: "landfall —" header.
//   2. Trigger form: "when(ever) a land [adjectives] enters".
//   3. Typed-land trigger form: "when(ever) a <land subtype> [adjectives]
//      enters" — Gate Colossus / Gateway Sneak ("a Gate you control
//      enters"). Land subtypes are still lands, so triggers anchored on
//      them belong on the landfall axis.
const PATTERNS = [
  /\blandfall\s*—/,
  /\bwhen(?:ever)?\s+(?:a|an|another|one or more)\s+lands?(?:\s+[\w\-']+){0,4}?\s+enters?\b/,
  /\bwhen(?:ever)?\s+(?:a|an|another|one or more)\s+(?:plains|islands?|swamps?|mountains?|forests?|gates?|caves?|spheres?|deserts?|towns?|locus|locuses|lairs?)(?:\s+[\w\-']+){0,4}?\s+enters?\b/,
];

export const rule: Rule = {
  id: 'trigger.landfall',
  axis: 'trigger',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['land', 'lands'], proximity: ['enters', 'whenever', 'when'], window: 6 },
};
