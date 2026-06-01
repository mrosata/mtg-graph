// pipeline/rules/effect.amplifies_damage_or_lifeloss.ts
//
// Replacement-effect doublers in the damage / life-loss family. Cards in this
// axis change "X damage" to "2X damage" or "X life" to "2X life" — the classic
// Furnace of Rath / Fiery Emancipation / Wound Reflection / Bloodletter shape.
// Single tag covers both axes because the regex shape is the same ("twice that
// much (damage|life) instead") and decks that want one usually want the other.
// Pairs with `trigger.damage_dealt` and `trigger.life_changed` on the consumer
// side — a doubler turns each damage / life-loss event into a stronger trigger
// input, so triggers that fire off those events synergize with these
// amplifiers. (pairsWith must cross axes; effect↔effect references are not
// admitted by the graph builder.)
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.amplifies_damage_or_lifeloss',
  axis: 'effect',
  label: 'Amplifies damage or life loss',
  description: 'Replacement effect that doubles damage dealt or life lost (Furnace of Rath / Wound Reflection / Bloodletter family).',
  pairsWith: ['trigger.damage_dealt', 'trigger.life_changed'],
};

const PATTERNS = [
  // Replacement-with-"instead" form. The "instead" tail is what distinguishes a
  // replacement effect from a passive "twice that much" reference.
  /\b(?:deals?|lose|loses) twice that much (?:damage|life)[^.]*?\binstead\b/,
  // Trigger-payoff form without "instead" — "at the beginning of each
  // opponent's end step, that player loses twice that much life" (Wound
  // Reflection). The "that much" back-reference still binds to a prior life-
  // loss event in the same sentence; it's not a replacement effect proper but
  // it's the same axis from a deckbuilding perspective.
  /\b(?:deals?|loses?) twice that much (?:damage|life)\b/,
  // v0.22.0 — The Rollercrusher Ride: "deals double that damage instead".
  // Same replacement-effect semantic as "twice that much"; different lexical
  // phrasing ("double" instead of "twice that much").
  /\b(?:deals?|loses?)\s+double\s+that\s+(?:damage|life)\b[^.]*?\binstead\b/,
];

export const rule: Rule = {
  id: 'effect.amplifies_damage_or_lifeloss',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['twice'], proximity: ['damage', 'life'], window: 4 },
};
