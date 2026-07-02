// pipeline/rules/effect.connive.ts
//
// Connive keyword (MSH) — draw a card, then discard a card, putting a +1/+1
// counter on the creature if a nonland card was discarded. Matched via the
// keyword/verb in normalized text ("it connives", "would connive") plus the
// Scryfall keyword list for keyword-line-only printings.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.connive',
  axis: 'effect',
  label: 'Connives',
  description:
    'Connives — draws a card, then discards a card, putting a +1/+1 counter on the creature if a nonland card was discarded.',
  pairsWith: ['trigger.card_drawn_discarded', 'condition.cares_plus_one_counter'],
};

const PATTERN = /\bconnives?\b/;

export const rule: Rule = {
  id: 'effect.connive',
  axis: 'effect',
  nearMiss: {
    anchors: ['connive'],
    proximity: ['draw', 'discard', 'counter'],
    window: 6,
  },
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card) => (card.keywords.includes('Connive') ? { evidence: 'Connive' } : false),
};
