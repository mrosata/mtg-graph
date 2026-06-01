// pipeline/rules/condition.threshold.ts
//
// Odyssey-era ability word: "Threshold — <effect>" activates when the
// controller has seven or more cards in their graveyard. The bare phrase
// "seven or more cards in your graveyard" also appears outside the ability
// word as a static gate (Crypt Feaster, Spider Spawning-style payoffs).
//
// Distinct from `condition.cares_graveyard`, which is the broader
// "scales with graveyard size" axis (delirium, "for each card in your
// graveyard"). Threshold is the specific 7+ binary gate.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.threshold',
  axis: 'condition',
  label: 'Threshold (7+ in graveyard)',
  description:
    'Ability word or static gate that activates while seven or more cards are in your graveyard.',
  pairsWith: ['effect.mill', 'effect.draws_or_discards'],
};

const PATTERNS = [
  // Ability-word header. Em-dash (U+2014) is the canonical separator after
  // an ability-word per current oracle templating; a straight hyphen also
  // appears in some legacy text.
  /\bthreshold\s*[—-]/,
  // Bare static gate: "if you have seven or more cards in your graveyard"
  /\bseven or more cards (?:are )?in [\w\s]+?graveyards?\b/,
];

export const rule: Rule = {
  id: 'condition.threshold',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['threshold', 'seven'], proximity: ['graveyard'], window: 10 },
};
