// pipeline/rules/effect.silence_opponents.ts
//
// "Your opponents can't cast spells…" / "…can't activate abilities…" —
// the static silence / stax hate-piece axis. Distinct from `effect.counterspell`
// (responsive, single-spell) and from `effect.has_ward` (cost-tax on the
// permanent itself). Members: Grand Abolisher, Drannith Magistrate, Vryn
// Wingmare (cost-tax — separate axis), Cursed Totem (activate-only), Voice
// of Victory, Kutzil, Conqueror's Flail, Dragonlord Dromoka.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.silence_opponents',
  axis: 'effect',
  label: 'Silences opponents',
  description:
    "Has a static restriction preventing opponents from casting spells or activating abilities. The hate-piece / stax axis — distinct from counterspells (responsive) and ward (cost-tax).",
  // Hate pieces don't have natural producer pairings — they're answers to
  // opponents' game plans, not synergy enablers.
  pairsWith: [],
};

// Anchor: "opponents can't (cast|activate)" — with optional "your" / "an"
// determiner and an optional context word before "can't" (e.g. "during your
// turn, your opponents can't cast spells").
const PATTERN = /\b(?:your\s+|an\s+)?opponents?\s+can't\s+(?:cast|activate)\b/;

export const rule: Rule = {
  id: 'effect.silence_opponents',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['opponents', "can't"],
    proximity: ['cast', 'activate', 'spells', 'abilities'],
    window: 6,
  },
};
