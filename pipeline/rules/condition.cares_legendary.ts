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

// v0.43.0 — Sauron FP: "Ward—Sacrifice a legendary artifact or legendary
// creature" fires PATTERN on "legendary creature" inside the Ward cost.
// Ward is paid by the OPPONENT targeting this card, not by the controller;
// matching it would create misleading legendary-payoff pairings. Scrub
// the Ward-cost segment before running PATTERN.
const NEGATIVE_WARD = /\bward\s*[—\-][^.]*?(?=\.|$)/g;

export const rule: Rule = {
  id: 'condition.cares_legendary',
  axis: 'condition',
  match: (t) => {
    let scrubbed = t;
    for (const m of t.matchAll(NEGATIVE_WARD)) {
      scrubbed = scrubbed.slice(0, m.index!) + ' '.repeat(m[0].length) + scrubbed.slice(m.index! + m[0].length);
    }
    const m = scrubbed.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['legendary'], proximity: ['you control', 'for each', 'another', 'two or more'], window: 6 },
};
