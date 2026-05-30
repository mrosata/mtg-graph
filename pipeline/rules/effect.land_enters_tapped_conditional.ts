// pipeline/rules/effect.land_enters_tapped_conditional.ts
//
// A Land that enters tapped unless some condition holds (fastlands, painlands,
// checklands, surveil lands) — or that lets you pay life to skip ETB-tapped
// (shocklands, the "pay 2 life" cycle). The shape varies by cycle but the
// deck-building question is the same: "does this slot in cleanly to a
// multi-color base, or does it cost me a turn?"
//
// Theme/filter — pure manabase utility. No payoff to pair with today.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.land_enters_tapped_conditional',
  axis: 'effect',
  label: 'Conditional ETB-tapped land',
  description:
    'A land that enters tapped only when a condition is unmet (fastlands, checklands, painlands) or lets you pay life to skip ETB-tapped (shocklands).',
  pairsWith: [],
  category: 'theme',
};

const PATTERNS = [
  // "enters tapped unless ..." — fastlands, checklands, painlands, surveil lands
  /\benters?\s+tapped\s+unless\b/,
  // "as this land enters, you may pay N life. if you don't, it enters tapped" — shocklands
  /\bas\s+(?:this|__self__)[^.]*?enters[^.]*?\bpay\s+\d+\s+life\b/,
  // generic "may pay N life" associated with land ETB-tapped
  /\bmay\s+pay\s+\d+\s+life[^.]*?enters?\s+tapped\b/,
  // multi-sentence "if you don't, it enters tapped" pay-life conditional
  // (e.g. Multiversal Passage's "Then you may pay 2 life. If you don't, it enters tapped.")
  /\bif you don'?t,?\s+(?:it\s+)?enters?\s+tapped\b/,
];

export const rule: Rule = {
  id: 'effect.land_enters_tapped_conditional',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if (!card.types.includes('Land')) return false;
    for (const re of PATTERNS) {
      const m = normalizedText.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
};
