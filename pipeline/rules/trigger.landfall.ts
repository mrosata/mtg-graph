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
  description: 'Has an ability that triggers when a land enters the battlefield (yours or neutral subject) — the landfall axis.',
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
  // v0.39.0 — 200-card audit Ship 8: Archaeomancer's Map. "Whenever a land
  // an opponent controls enters" is opponent-controlled, not yours. Add a
  // negative lookahead on the opponent-control qualifiers so the trigger
  // is scoped to "yours or neutral subject" only.
  /\bwhen(?:ever)?\s+(?:a|an|another|one or more)\s+lands?(?!\s+(?:an\s+opponent\s+controls|your\s+opponents\s+control))(?:\s+[\w\-']+){0,4}?\s+enters?\b/,
  /\bwhen(?:ever)?\s+(?:a|an|another|one or more)\s+(?:plains|islands?|swamps?|mountains?|forests?|gates?|caves?|spheres?|deserts?|towns?|locus|locuses|lairs?)(?!\s+(?:an\s+opponent\s+controls|your\s+opponents\s+control))(?:\s+[\w\-']+){0,4}?\s+enters?\b/,
  // v0.32 — Group 9 — The Endstone: "Whenever you play a land or cast a
  // spell". The "play a land" anchor is the landfall axis even when phrased
  // with "play" rather than "enters". Also matches the bare "when you play a
  // land" template.
  /\bwhen(?:ever)?\s+you\s+play\s+a\s+land\b/,
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
