// pipeline/rules/effect.forage.ts
//
// Bloomburrow keyword action. "Forage" — exile three cards from your
// graveyard OR sacrifice a Food. Used in several framings:
//   (a) "you may forage" — optional action inside a triggered effect.
//   (b) "Forage:" / "{T}, Forage:" — activation cost.
//   (c) "forage or pay {N}" — alternative cost on a spell.
//   (d) "by foraging" / "whenever you forage" — gerund / observer frame.
//
// The reminder text "(To forage, exile three cards from your graveyard or
// sacrifice a Food.)" is stripped pre-tagging, leaving only the verb form.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.forage',
  axis: 'effect',
  label: 'Forages',
  description:
    'Has or pays a Forage cost — exile three cards from your graveyard or sacrifice a Food. Bloomburrow keyword action.',
  // Producers: Food-creation effects directly enable the sacrifice-a-Food
  // half of forage's cost. The graveyard-exile half is already linked
  // automatically via effect.exile_from_graveyard, which forage cards
  // tag as a side-effect of the cost.
  pairsWith: ['condition.cares_subtype.food'],
};

// Match "forage" or "foraging" as a verb / gerund, anchored on word
// boundaries so the creature subtype "Forager" doesn't false-match.
const PATTERN = /\bforag(?:e|ing)\b/;

export const rule: Rule = {
  id: 'effect.forage',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['forage'], proximity: ['may', 'whenever', 'graveyard'], window: 6 },
};
