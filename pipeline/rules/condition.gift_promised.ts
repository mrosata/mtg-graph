// pipeline/rules/condition.gift_promised.ts
//
// Gift-promised conditional — gates an effect on whether the gift was promised
// during casting. The "if the gift was promised" half of Bloomburrow/Duskmourn
// Gift spells (Crumb and Get It, Coiling Rebirth, Cruelclaw's Heist, Dewdrop
// Cure, Dawn's Truce). The producer half lives on effect.has_gift (the
// keyword). This condition fires on cards that DISTINGUISH the gift-promised
// payoff from the baseline effect — the in-card branch that activates only
// when the gift was actually promised.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.gift_promised',
  axis: 'condition',
  label: 'Cares about gift being promised',
  description: 'Has an "if the gift was promised" gate inside another ability. The conditional half of the Duskmourn Gift axis.',
  pairsWith: ['effect.has_gift', 'trigger.gift_promised'],
};

const PATTERNS = [
  // "if the gift was promised" — canonical conditional gate.
  /\bif (?:the |a )?gift was promised\b/,
  // "if you promised a gift" — active-voice variant.
  /\bif you promised (?:a |the )?gift\b/,
];

export const rule: Rule = {
  id: 'condition.gift_promised',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['gift'], proximity: ['promised', 'if'], window: 4 },
};
