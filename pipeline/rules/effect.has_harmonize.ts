// pipeline/rules/effect.has_harmonize.ts
//
// Harmonize keyword — cast from the graveyard for an alternate cost; tap a
// creature to reduce that cost by its power. Then exile. Read from Scryfall's
// `keywords` array. Theme-category filter tag; no current "harmonize matters"
// payoff but cast-from-graveyard archetypes (delirium, escape-style) often
// care about this implicitly via graveyard-matters tags.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_harmonize',
  axis: 'effect',
  label: 'Has harmonize',
  description: 'Has the Harmonize keyword — castable from the graveyard for an alternate cost, reducible by tapping creatures.',
  pairsWith: [
    // Harmonize is a cast-from-graveyard mechanic — it cares about being in
    // its owner's graveyard. The single cross-axis pair to cares_graveyard
    // captures the right semantic; effect→effect pairings (surveil/mill/etc.)
    // would violate the catalog invariant. Connectivity to graveyard-fill
    // effects flows transitively via the cares_graveyard tag we also assign
    // to harmonize cards (see condition.cares_graveyard's keyword matchCard).
    'condition.cares_graveyard',
  ],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_harmonize',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Harmonize') ? { evidence: 'Harmonize' } : false),
};
