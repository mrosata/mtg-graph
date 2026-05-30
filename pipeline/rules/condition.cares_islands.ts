// pipeline/rules/condition.cares_islands.ts
//
// "Islands matter" condition — counts or triggers on Islands you control.
// Touches Eluge, Tempest Djinn, Waterlogged Hulk / Watertight Gondola, and
// Waterbending Scroll. Pairs with effect.land_becomes_island (the flood-counter
// axis that creates new Islands mid-game) and with effect.add_mana for the
// basic Island fodder side.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_islands',
  axis: 'condition',
  label: 'Cares about Islands',
  description: 'Counts or triggers off Islands you control — mono-blue/Islands-matter payoffs.',
  pairsWith: [
    'effect.land_becomes_island',
    'effect.add_mana',
  ],
};

const PATTERNS = [
  // "number of Islands you control" — P/T or static scaling
  /\bnumber of (?:basic )?islands? you control\b/,
  // "for each Island you control"
  /\bfor each (?:basic )?islands? you control\b/,
  // "X or more Islands" — covers both digit ("4 or more") and word ("four or
  // more") forms; MTG templating uses digits but the rule shouldn't be
  // brittle to either.
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) or more (?:basic )?islands?\b/,
  // "Whenever an Island enters [under your control / the battlefield]"
  /\bwhenever (?:an?|another) island enters\b/,
  // Generic "+N/+M for each ... island you control"
  /\bgets \+\d+\/\+\d+ for each (?:basic )?island you control\b/,
  // Cost-side Island references — Craft/activated/triggered costs that
  // require exiling, tapping, sacrificing, or returning an Island. The card
  // doesn't scale with Islands but still depends on them as a resource.
  // Anchored on either "you control" or "card(s) from ... graveyard" to
  // avoid matching ramp tutors ("search your library for an Island card").
  /\b(?:exile|sacrifice|tap|return) (?:an?|target|another|up to (?:one|two|three)) (?:untapped |tapped )?(?:basic )?islands?\s+(?:cards?\s+from|you control)\b/,
  // Craft-with-Island keyword (Lost Caverns of Ixalan transform mechanic).
  // Reminder text is stripped, so the inner "Exile an Island you control"
  // clause is gone — the keyword line is the only surviving anchor.
  /\bcraft with islands?\b/,
];

export const rule: Rule = {
  id: 'condition.cares_islands',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['island', 'islands'],
    proximity: ['number', 'each', 'control'],
    window: 6,
  },
};
