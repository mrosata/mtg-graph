// pipeline/rules/condition.cares_legendary.ts
//
// Cares-about-legendary axis. Fires on body references to legendary creatures
// / permanents / spells as a deckbuilding axis. The card's own legendary
// supertype on `typeLine` is NOT enough — the rule requires explicit body
// text. Distinct from `condition.cares_tribe.<X>` which scopes to creature
// subtypes.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_legendary',
  axis: 'condition',
  label: 'Cares about Legendary',
  description:
    'References legendary creatures, permanents, or spells as a payoff axis — the legendary-tribal / Commander-flavor archetype.',
  pairsWith: ['effect.create_creature_token'],
  category: 'theme',
};

// Anchor on the standalone word `legendary` followed by a creature/permanent
// /spell noun (with optional adjective slot for "creature" / "creature card").
// Negative lookbehind for "non-" guards against "non-legendary" restrictions.
const PATTERN =
  /(?<!non-)\blegendary\s+(?:creatures?|permanents?|spells?|cards?)\b/;

export const rule: Rule = {
  id: 'condition.cares_legendary',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['legendary'], proximity: ['you control', 'for each', 'another', 'two or more'], window: 6 },
};
