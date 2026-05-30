// pipeline/rules/trigger.beginning_of_combat.ts
//
// Phase trigger — "at the beginning of combat on your turn" (the dominant
// form) plus the less-common "at the beginning of each combat" scope. Sibling
// to `trigger.beginning_of_end_step`; together they anchor the
// phase-trigger family. The combat-phase variant is heavily used by combat
// payoffs (Howlsquad Heavy's token-generator, Manifold Mouse's anthem,
// Brambleguard Captain's stat-pump) and by attach/saddle/crew enablers
// (Alacrian Armory, Blacksmith's Talent).
//
// pairsWith is intentionally sparse — phase triggers naturally co-occur with
// almost every combat-relevant effect, and over-pairing creates graph noise.
// Limit to the most actionable downstream effects.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.beginning_of_combat',
  axis: 'trigger',
  label: 'Triggers at the beginning of combat',
  description:
    'Has an ability that triggers at the beginning of combat (typically "on your turn"; less commonly "each combat" or "each player\'s combat").',
  pairsWith: [
    'effect.grants_stat_buff',
    'effect.create_creature_token',
    'effect.plus_one_counter',
  ],
};

// Anchor on the literal phrase. The trailing scope is one of:
// - "on your turn" (the modern standard form)
// - "on each player's turn" / "on the chosen player's turn"
// - "" (bare "at the beginning of combat" — rare, e.g. Sneak Attack variants)
// - "each combat" / "each opponent's combat" — phase scope
// The trailing word boundary or comma confirms a trigger-clause anchor.
const PATTERN = /\bat the beginning of (?:combat(?:\s+on\s+(?:your|each\s+(?:player'?s|opponent'?s)|the\s+chosen\s+player'?s)\s+turn)?|each(?:\s+(?:opponent'?s|player'?s))?\s+combat)\b/;

export const rule: Rule = {
  id: 'trigger.beginning_of_combat',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['combat'], proximity: ['beginning', 'your', 'each'], window: 6 },
};
