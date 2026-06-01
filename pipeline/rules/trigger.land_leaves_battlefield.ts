// pipeline/rules/trigger.land_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.land_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when a land leaves the battlefield',
  description: 'Triggers when a land leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_land',
    'effect.exile_land',
    'effect.sacrifice_land',
    'effect.bounce_land',
  ],
};

const LTB_VERB = '(?:leaves? the battlefield|(?:is|are) put into a graveyard from the battlefield)';

const PATTERN_TEXT = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a\\s+|an\\s+|another\\s+|the\\s+|each\\s+|each\\s+other\\s+)?(?:[\\w\\-]+\\s+){0,3}?land(?:\\s+[\\w\\-]+){0,4}?\\s+${LTB_VERB}\\b`,
);

const PATTERN_SELF = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:this\\s+\\w+\\s+|__self__\\s+)${LTB_VERB}\\b`,
);

// v0.20.0 — self-sacrifice templating "when you sacrifice this land /
// __self__". Active-voice form, same axis as a self-LtB. Family-wide
// mirror of G31 (Disturbing Mirth).
const PATTERN_SELF_SACRIFICE = /\bwhen(?:ever)?\s+you\s+sacrifices?\s+(?:this\s+land|__self__)\b/;

export const rule: Rule = {
  id: 'trigger.land_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card, normalizedText: string) => {
    if (!card.types.includes('Land')) return false;
    const m = normalizedText.match(PATTERN_SELF) ?? normalizedText.match(PATTERN_SELF_SACRIFICE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['land'], window: 6 },
};
