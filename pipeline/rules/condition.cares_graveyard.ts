// pipeline/rules/condition.cares_graveyard.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_graveyard',
  axis: 'condition',
  label: 'Cares about graveyard',
  description: 'Triggers or scales off graveyard size or content.',
  pairsWith: ['effect.mill', 'effect.reanimate'],
};

const PATTERNS = [
  // "for each card in [a/your/all] graveyard(s)" — graveyard-size scaling.
  // v0.19 — optional possessive between "cards?" and "in" (Huskburster
  // Swarm: "for each creature card you own in exile and in your graveyard").
  // The Cosmogoyf / Slime Against Humanity-style "you own / you control /
  // owned by you" qualifier is a common Bloomburrow / OTJ templating.
  /\bfor each (?:[\w\s\-]+? )?cards? (?:you own |you control |owned by you )?in [\w\s]+?graveyards?\b/,
  // "number of [type] cards in [a/your/all] graveyard(s)"
  /\bnumber of (?:[\w\s\-]+? )?cards? in [\w\s]+?graveyards?\b/,
  // "cards in your graveyard" / "cards in graveyards" / "cards in all graveyards"
  /\bcards? in (?:your |an opponent's |all |a )?graveyards?\b/,
  // "if there are [N or more] cards in [a/your] graveyard"
  /\bif there are (?:[\d]+ or more |[\w\s\-]+ )?cards? in [\w\s]+?graveyards?\b/,
  // "whenever a [type] card is put into a graveyard"
  /\bwhenever (?:a |an |another )?(?:[\w\-]+ )?card is put into [\w\s]+?graveyards?\b/,
  // v0.14.7 — cast-from-graveyard as a graveyard-cares reference. Casting
  // out of a graveyard uses graveyard contents as a resource — distinct
  // from removal effects like "exile target card from a graveyard" (which
  // remain in the negative-match set) because the verb is `cast`.
  // Flotsam // Jetsam: "cast a spell from each opponent's graveyard".
  // Tarrian's Journal-style: "cast this card from your graveyard".
  /\bcast\s+(?:[\w\-' ]+? )?from\s+(?:your|each opponent's|each player's|an opponent's|target opponent's|a)\s+graveyards?\b/,
];

export const rule: Rule = {
  id: 'condition.cares_graveyard',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['graveyard', 'graveyards'], proximity: ['cards', 'number'], window: 6 },
};
