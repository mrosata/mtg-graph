// pipeline/rules/condition.adventure_matters.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.adventure_matters',
  axis: 'condition',
  label: 'Adventure matters',
  description: 'Triggers or scales on Adventure spells cast (excluding the card itself being an Adventure).',
  pairsWith: ['trigger.spell_cast', 'effect.adventure_card'],
};

// Match cards that reference Adventures AS A CATEGORY (not cards that simply
// HAVE an Adventure side). The brief accepts the false-positive risk that
// adventure-having cards mention the word "adventure" in their own text.
//
// Patterns:
//   - "whenever you cast an adventure (spell)" — explicit trigger
//   - "adventure spell(s)" — anywhere (catches "adventure spells you cast cost...")
//   - "adventure card(s)" — anywhere (catches "return target adventure card...")
//   - "has/have an adventure" — references a card that has an Adventure as a
//     category condition (e.g., "permanent spells you cast that have an adventure",
//     "card that has an adventure"). This is the WOE-block phrasing for Adventure
//     payoffs that don't use the "Adventure spell" wording.
const PATTERNS = [
  /\bwhenever [\w\s']+? cast(?:s|ed)?\s+(?:an?|one|another)\s+adventure\b/,
  /\badventure spells?\b/,
  /\badventure cards?\b/,
  /\b(?:has|have) an adventure\b/,
];

export const rule: Rule = {
  id: 'condition.adventure_matters',
  axis: 'condition',
  match: (t) => {
    for (const p of PATTERNS) {
      const m = t.match(p);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['adventure'], proximity: ['cast', 'spell', 'card'], window: 6 },
};
