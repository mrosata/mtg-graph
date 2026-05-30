// pipeline/rules/effect.add_mana.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.add_mana',
  axis: 'effect',
  label: 'Adds mana',
  description: "Adds mana to a player's mana pool (ramp / fixing / ritual).",
  pairsWith: [],
};

// Overmatch-prone: many cards mention "mana" without adding to a pool. The rule
// anchors on the verb "add(s)" immediately followed (within a tight window) by
// either a mana-symbol payload (e.g. {g}, {c}, {2}, {x}) or a "mana of any
// color" / "mana in any combination" / "mana of any one color" phrase.
//
// Restriction clauses ("spend this mana only to cast..."), cost reductions
// ("costs {1} less"), and alternative costs ("you may pay {2} rather than...")
// are excluded because they don't use the verb "add".
const PATTERNS = [
  // "add [N|X|one|two|...|amount of] {<symbol>}" — any mana symbol, optionally
  // repeated (e.g. {w}{u}). Allows a short prefix between "add" and the symbol
  // for "add one mana of {G}" or "add an additional {R}" style phrasing.
  /\badds?\s+(?:[\w\s]{0,30}?)?\{[wubrgcxs0-9]\}/,
  // "add [count] mana of <colors-phrase>": any/the chosen/that/that creature's/
  // any one. Covers the common rainbow/fixing/ritual templates including
  // colorshift lands ("add one mana of the chosen color") and devotion-style
  // payoffs ("add one mana of that color"). The count slot accepts numerics,
  // word counts, "an additional", "that much/many", and "ten" for big rituals.
  /\badds?\s+(?:an additional\s+)?(?:\d+|x|one|two|three|four|five|six|seven|eight|nine|ten|that much|that many)\s+mana\s+(?:of\s+(?:any|the|that|the\s+chosen)|in\s+any)\b/,
];

// Basic land subtypes that grant intrinsic mana abilities. A Land with any
// of these in its subtypes adds mana even when oracle text only references
// the ability via reminder text (stripped by normalization) or is empty
// entirely (vanilla basics). Covers the 6 basics, 10 shocklands, surveil
// lands, and any dual-basic-typed lands printed since.
const BASIC_LAND_SUBTYPES = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

export const rule: Rule = {
  id: 'effect.add_mana',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  matchCard: (card) => {
    if (!card.types.includes('Land')) return false;
    for (const st of card.subtypes) {
      if (BASIC_LAND_SUBTYPES.has(st)) return { evidence: `subtype ${st}` };
    }
    return false;
  },
  nearMiss: {
    anchors: ['add'],
    proximity: ['mana', '{w}', '{u}', '{b}', '{r}', '{g}', '{c}'],
    window: 6,
  },
};
