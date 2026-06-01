// pipeline/rules/effect.prevent_damage.ts
//
// Fog-family damage prevention. Recurring archetype (Fog, Holy Day, Healing
// Salve, Eerie Interference, Settle the Wreckage's no-damage clause). Pairs
// as an "answer" to damage-dealing sources and damage-dealt triggers — the
// graph models this as a hate / counter relationship rather than a synergy,
// but the pairing is meaningful for "what stops my damage strategy?" queries.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.prevent_damage',
  axis: 'effect',
  label: 'Prevents damage',
  description: 'Prevents damage that would be dealt (Fog / Holy Day / Healing Salve family). The "answer" axis to damage sources.',
  pairsWith: ['trigger.damage_dealt'],
};

// "Prevent (all|the next N) (combat )?damage that would be dealt..." Covers
// both Fog-style (all combat damage) and Healing-Salve-style (next N damage
// to target). The "that would be dealt" is the disambiguating anchor — it
// distinguishes prevention from damage-dealing or damage-replacement text.
const PATTERN = /\bprevents?\s+(?:all|the next \d+)\s+(?:combat\s+)?damage that would be dealt\b/;

// v0.22.0 — The Mindskinner: "if a source ... would deal damage to ..., prevent
// that damage". Replacement-effect form. The `would deal damage` antecedent
// anchors it to a damage-prevention semantic; bare "prevent that damage"
// without the antecedent could appear in other contexts.
const REPLACEMENT_PATTERN = /\bwould\s+deal[^.]{0,80}?\bdamage\b[^.]{0,40}?,\s*prevent that damage\b/;

export const rule: Rule = {
  id: 'effect.prevent_damage',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(REPLACEMENT_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['prevent'], proximity: ['damage', 'dealt'], window: 6 },
};
