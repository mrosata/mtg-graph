// pipeline/rules/effect.attack_tax.ts
//
// Propaganda / Ghostly Prison family: imposes a mana cost on opponents'
// attacks. trigger.attacks does not exist; no pairsWith here.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.attack_tax',
  axis: 'effect',
  label: 'Attack tax',
  description:
    "Imposes a mana cost on opponents' attacks (creatures can't attack unless their controller pays, or attacks cost extra mana). Propaganda / Ghostly Prison family.",
  pairsWith: ['trigger.attack_or_block'],
};

const PATTERNS = [
  /creatures? can'?t attack (?:you|its controller)?(?:\s+or planeswalkers?\s+[\w\s]+\s+control)?\s*unless (?:its|their) controller pays/,
  /creatures? attacking you cost \{[^}]+\} more/,
  /attacking creatures? cost \{[^}]+\} more (?:to attack)?/,
  /players? can'?t attack (?:you|its controller) unless they pay/,
  // "each opponent attacks with creatures only if they pay" (Meekstone-variant)
  /each opponent attacks with creatures only if they pay/,
  // Generic "can't attack unless ... pays" (creature singular)
  /creature can'?t attack unless its controller pays/,
];

export const rule: Rule = {
  id: 'effect.attack_tax',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['attack', 'attacking'], proximity: ['pay', 'cost'], window: 8 },
};
