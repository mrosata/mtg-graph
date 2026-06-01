// pipeline/rules/trigger.enchantment_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.enchantment_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when an enchantment leaves the battlefield',
  description: 'Triggers when an enchantment leaves the battlefield (covers destroy, exile, bounce, sacrifice).',
  pairsWith: [
    'effect.destroy_enchantment',
    'effect.exile_enchantment',
    'effect.sacrifice_enchantment',
    'effect.bounce_enchantment',
  ],
};

const LTB_VERB = '(?:leaves? the battlefield|(?:is|are) put into a graveyard from the battlefield)';

const PATTERN_TEXT = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a\\s+|an\\s+|another\\s+|the\\s+|each\\s+|each\\s+other\\s+|an?\\s+aura\\s+)?(?:[\\w\\-]+\\s+){0,3}?(?:enchantment|aura)(?:\\s+[\\w\\-]+){0,4}?\\s+${LTB_VERB}\\b`,
);

const PATTERN_SELF = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:this\\s+\\w+\\s+|__self__\\s+)${LTB_VERB}\\b`,
);

// v0.20.0 — Disturbing Mirth: "when you sacrifice this enchantment / aura
// / __self__" — active-voice self-sacrifice templating. Same axis as the
// enchantment leaving the battlefield via sacrifice.
const PATTERN_SELF_SACRIFICE = /\bwhen(?:ever)?\s+you\s+sacrifices?\s+(?:this\s+(?:enchantment|aura)|__self__)\b/;

export const rule: Rule = {
  id: 'trigger.enchantment_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card, normalizedText: string) => {
    if (!card.types.includes('Enchantment')) return false;
    const m = normalizedText.match(PATTERN_SELF) ?? normalizedText.match(PATTERN_SELF_SACRIFICE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['enchantment'], window: 6 },
};
