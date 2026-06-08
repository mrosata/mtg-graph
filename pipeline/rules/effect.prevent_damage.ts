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
// FIX 19 (BR-14) — Crystal Barricade: "prevent all noncombat damage that
// would be dealt". Admit `noncombat` alongside `combat` in the optional
// modifier slot.
const PATTERN = /\bprevents?\s+(?:all|the next \d+)\s+(?:(?:non)?combat\s+)?damage that would be dealt\b/;

// v0.22.0 — The Mindskinner: "if a source ... would deal damage to ..., prevent
// that damage". Replacement-effect form. The `would deal damage` antecedent
// anchors it to a damage-prevention semantic; bare "prevent that damage"
// without the antecedent could appear in other contexts.
// v0.39.0 — 200-card audit Ship 5: Anti-Venom uses the passive voice
// "if damage would be dealt to you, prevent that damage". In active form
// `damage` follows `would deal`; in passive form `damage` precedes
// `would be dealt`. Admit both voices with two alternative arms.
const REPLACEMENT_PATTERN =
  /\b(?:would\s+deal[^.]{0,80}?\bdamage\b|\bdamage\b[^.]{0,80}?\bwould\s+be\s+dealt\b)[^.]{0,60}?,\s*prevent that damage\b/;

export const rule: Rule = {
  id: 'effect.prevent_damage',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(REPLACEMENT_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['prevent'], proximity: ['damage', 'dealt'], window: 6 },
};
