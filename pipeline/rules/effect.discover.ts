// pipeline/rules/effect.discover.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.discover',
  axis: 'effect',
  label: 'Discover N',
  description:
    'LCI keyword action: exile cards from the top of your library until you exile a nonland card with mana value N or less, then cast it free or put it into your hand.',
  pairsWith: ['trigger.discovered'],
};

// "discover N" — keyword action with mandatory numeric argument. The reminder
// text gets stripped before normalization, so we only ever see the action
// itself (no risk of matching the parenthetical explanation). Also accepts
// "discovers N" (third-person, e.g. "each player discovers 2") and "discover x"
// / "discovers x" (Zoyowa's Justice family — variable amount).
const PATTERN = /\bdiscovers?\s+(?:\d+|x)\b/;

export const rule: Rule = {
  id: 'effect.discover',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['discover'], proximity: ['library', 'mana value', 'nonland'], window: 8 },
};
