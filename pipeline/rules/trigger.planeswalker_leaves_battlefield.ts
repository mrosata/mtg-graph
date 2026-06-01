// pipeline/rules/trigger.planeswalker_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.planeswalker_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when a planeswalker leaves the battlefield',
  description: 'Triggers when a planeswalker leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_planeswalker',
    'effect.exile_planeswalker',
    'effect.sacrifice_planeswalker',
    'effect.bounce_planeswalker',
  ],
};

const LTB_VERB = '(?:leaves? the battlefield|(?:is|are) put into a graveyard from the battlefield)';

const PATTERN_TEXT = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a\\s+|an\\s+|another\\s+|the\\s+|each\\s+|each\\s+other\\s+)?(?:[\\w\\-]+\\s+){0,3}?planeswalker(?:\\s+[\\w\\-]+){0,4}?\\s+${LTB_VERB}\\b`,
);

const PATTERN_SELF = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:this\\s+\\w+\\s+|__self__\\s+)${LTB_VERB}\\b`,
);

// v0.20.0 — self-sacrifice templating "when you sacrifice this planeswalker /
// __self__". Active-voice form, same axis as a self-LtB. Family-wide mirror
// of G31 (Disturbing Mirth).
const PATTERN_SELF_SACRIFICE = /\bwhen(?:ever)?\s+you\s+sacrifices?\s+(?:this\s+planeswalker|__self__)\b/;

export const rule: Rule = {
  id: 'trigger.planeswalker_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card, normalizedText: string) => {
    if (!card.types.includes('Planeswalker')) return false;
    const m = normalizedText.match(PATTERN_SELF) ?? normalizedText.match(PATTERN_SELF_SACRIFICE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['planeswalker'], window: 6 },
};
