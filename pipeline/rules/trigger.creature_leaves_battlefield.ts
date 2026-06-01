// pipeline/rules/trigger.creature_leaves_battlefield.ts
import type { Rule } from './types';
import type { Card, TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.creature_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when a creature leaves the battlefield',
  description: 'Triggers when a creature leaves the battlefield (broader than dies — covers exile, bounce, and sacrifice). Distinct from trigger.creature_dies which fires only on death.',
  pairsWith: [
    'effect.destroy_creature',
    'effect.exile_creature',
    'effect.sacrifice_creature',
    'effect.bounce_creature',
  ],
};

// v0.14.1 — added "is exiled from the battlefield" route. Craft (Market Gnome
// "when this creature is exiled from the battlefield while you're activating
// a craft ability") and other exile-route LTBs are still leaves-battlefield
// triggers semantically.
//
// v0.14.9 — added "(is|are) put into exile" verb route. Kaya, Spirits'
// Justice: "whenever one or more creatures you control ... are put into
// exile" — the subject context ("creatures you control") confirms the
// origin is the battlefield, even without explicit "from the battlefield".
// v0.19 — `leaves?` allows the plural-verb form ("creatures ... leave the
// battlefield") for plural-subject triggers (Dour Port-Mage: "whenever one or
// more other creatures you control leave the battlefield without dying").
const LTB_VERB = '(?:leaves? the battlefield|(?:is|are) put into a graveyard from the battlefield|(?:is|are) exiled from the battlefield|(?:is|are) put into exile)';

// Non-SELF: "whenever/when [a/an/another] creature [adjectives ...] leaves the battlefield".
// v0.14.9 — added "one or more" determiner and plural-noun support
// (Kaya: "whenever one or more creatures you control are put into exile").
// Adjective filler char class includes `/` so compound subjects with
// "and/or" don't break tokenization (Kaya: "creatures you control and/or
// creature cards in your graveyard are put into exile").
const PATTERN_TEXT = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a\\s+|an\\s+|another\\s+|the\\s+|each\\s+|each\\s+other\\s+|an?\\s+enchanted\\s+|one or more\\s+)?(?:[\\w\\-]+\\s+){0,3}?creatures?(?:\\s+[\\w\\-/]+){0,10}?\\s+${LTB_VERB}\\b`,
);

// SELF trigger: text says "when __self__ leaves the battlefield" AND the card is a creature.
const PATTERN_SELF = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:this\\s+\\w+\\s+|__self__\\s+)${LTB_VERB}\\b`,
);

export const rule: Rule = {
  id: 'trigger.creature_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_TEXT);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card: Card, normalizedText: string) => {
    if (!card.types.includes('Creature')) return false;
    const m = normalizedText.match(PATTERN_SELF);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield', 'leaves the'], proximity: ['creature'], window: 6 },
};
