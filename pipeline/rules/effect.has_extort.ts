// pipeline/rules/effect.has_extort.ts
//
// Extort keyword — "Whenever you cast a spell, you may pay {W/B}. If you do,
// each opponent loses 1 life and you gain that much life." Reminder text is
// stripped in normalization, so only the bare keyword survives on the card
// (The Kingpin of Crime). Keyword-anchor rule mirroring effect.has_cycling,
// with a word-bounded text fallback.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_extort',
  axis: 'effect',
  label: 'Has extort',
  description:
    'Has extort — whenever you cast a spell, may pay {W/B} to drain each opponent for 1.',
  pairsWith: ['condition.cares_lifegain', 'condition.cares_lifeloss'],
};

const PATTERN = /\bextort\b/;

export const rule: Rule = {
  id: 'effect.has_extort',
  axis: 'effect',
  nearMiss: {
    anchors: ['extort'],
    proximity: ['pay', 'life', 'spell'],
    window: 10,
  },
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card) => (card.keywords.includes('Extort') ? { evidence: 'Extort' } : false),
};
