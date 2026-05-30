// pipeline/rules/effect.fight.ts
//
// Fight — the combat keyword action where two creatures deal damage to each
// other equal to their respective power. Distinct from `effect.deals_damage`
// and `effect.causes_damage` because the pairing semantics are different:
// fight-shaped removal scales with the source creature's power and pairs
// naturally with high-power / power-buff payoffs.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.fight',
  axis: 'effect',
  label: 'Fight effect',
  description:
    'Causes two creatures to fight (each deals damage equal to its power to the other). Includes "fight-shaped" plural-deal-damage frames (Graceful Takedown) where the literal word "fight" is absent but the mechanic is identical.',
  pairsWith: ['condition.cares_high_power', 'trigger.damage_dealt'],
};

// Literal "fight" verb. Anchored by the determiners that precede the target
// noun in real fight templating: "fights target", "fights another", "fights
// up to", "fight each other". Avoids false-positives on "fight crime" (choice
// mode) by requiring a creature-shaped object after the verb.
const PATTERN_LITERAL =
  /\bfights?\s+(?:target\s+creature|another\s+target\s+creature|up\s+to\s+(?:one|two|three)\s+(?:other\s+)?(?:target\s+)?creature|each\s+other)\b/;

// Fight-shaped damage frame without the literal word "fight" — Graceful
// Takedown shape. Requires "(creatures?) ... each deal damage equal to their
// power to target creature". The "target creature you don't control" /
// "target creature an opponent controls" tail confirms the removal-against-
// opponent semantic. Capped filler keeps the regex local.
//
// v0.14.7 — narrowed to require the literal "each deal damage equal to
// their power" plural form (Hard-Hitting Question FP). Singular-subject
// "deals damage equal to its power to target creature" is one-sided
// pump-and-poke (Prey Upon family) — not a fight, since fight requires
// reciprocal damage between two creatures. Single-source frames belong to
// `effect.deals_damage` / `effect.causes_damage`. The narrowing also
// prevents matching cards whose target slot allows "or planeswalker" (Hard-
// Hitting Question) — fights can only target creatures.
const PATTERN_SHAPED =
  /(?<!this |the |that |__self__\s)\bcreatures?(?:\s+you control)?[^.]{0,140}?each\s+deal\s+damage\s+equal\s+to\s+their\s+power\s+to\s+target\s+creature(?:\s+(?:you don't control|an opponent controls))?/;

export const rule: Rule = {
  id: 'effect.fight',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_LITERAL) ?? t.match(PATTERN_SHAPED);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['fight'], proximity: ['creature', 'target', 'power'], window: 6 },
};
