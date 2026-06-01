// pipeline/rules/condition.raid.ts
//
// Raid ability word — gates an effect on whether you attacked this turn.
// Khans of Tarkir block original printing; resurfaced in OTJ and across recent
// Standard sets (Goblin Boarders, Gorehorn Raider, Midnight Snack,
// Perforating Artist, Gutless Plunderer).
//
// Two frames cover modern templating:
//   1. Ability-word header: `raid —` (em-dash U+2014).
//   2. Bare gate clause: `if you attacked this turn` / `if you've attacked
//      this turn` (un-ability-worded — Bloodsoaked Champion's reanimate
//      condition uses this form).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.raid',
  axis: 'condition',
  label: 'Raid',
  description:
    'Raid ability word — gates an effect on whether you attacked this turn. Matches both the ability-word frame and the bare "if you (have) attacked this turn" gate.',
  // Raid pays off on the attack step having happened — the natural producers
  // are triggers tied to attacking creatures (effect-axis declarations of
  // attacking). Mirror condition.celebration's pairs-with-trigger style.
  pairsWith: ['trigger.attack_or_block'],
};

const PATTERNS = [
  // Ability-word header. Em-dash is U+2014.
  /\braid\s*—/,
  // Bare gate — both contracted ("you've") and bare ("you attacked").
  /\bif you(?:'ve)? attacked this turn\b/,
  // Activated-ability-style condition: "activate only if you attacked this
  // turn" (Bloodsoaked Champion reanimate).
  /\bactivate only if you(?:'ve)? attacked this turn\b/,
];

export const rule: Rule = {
  id: 'condition.raid',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['raid', 'attacked'], proximity: ['this turn', 'if you'], window: 8 },
};
