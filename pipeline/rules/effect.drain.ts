// pipeline/rules/effect.drain.ts
//
// "<opponent> loses N life and you gain N life" — the unified drain effect
// where both halves resolve as a single ability. Sanguine Bond / Vito /
// Acolyte of Aclazotz / Treacherous Greed family.
//
// Distinct from `effect.has_lifelink` (combat-damage replacement) and from
// the separate `effect.life_changed` halves — drain pairs gain and loss
// as one effect, which is a stronger payoff signal for lifegain decks
// than either half alone.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.drain',
  axis: 'effect',
  label: 'Drain life',
  description:
    'Unified drain effect — causes an opponent to lose N life AND you to gain N life as one ability. Distinct from lifelink (combat replacement) and from standalone life_changed halves.',
  pairsWith: ['condition.cares_lifegain', 'trigger.life_changed'],
};

const SUBJECT = "(?:target opponent|target player|each opponent|each player|that player|that opponent|an opponent|opponents?)";
const AMOUNT = "(?:\\d+|x|that much|that many)";

const PATTERNS = [
  // Forward: "<subject> loses N life and you gain N life"
  new RegExp(`\\b${SUBJECT}\\s+loses?\\s+${AMOUNT}\\s+life\\s+and\\s+you\\s+gain\\s+${AMOUNT}\\s+life\\b`),
  // Reversed: "you gain N life. <subject> loses N life" — sentence boundary
  // join. The boundary tightens this so two unrelated halves on the same
  // card can't accidentally merge.
  new RegExp(`\\byou\\s+gain\\s+${AMOUNT}\\s+life\\.\\s+${SUBJECT}\\s+loses?\\s+${AMOUNT}\\s+life\\b`),
];

export const rule: Rule = {
  id: 'effect.drain',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['gain', 'lose'], proximity: ['life', 'opponent', 'and'], window: 6 },
};
