// pipeline/rules/effect.cost_reduction.ts
//
// Generic cost reduction — covers Agatha's static ("activated abilities ...
// cost {X} less to activate"), Goreclaw-style spell reducers ("creature
// spells you cast cost {2} less"), and scaling reducers ("this spell costs
// {1} less for each ..."). We require the literal phrase "cost {N} less" to
// avoid alternative-cost templates ("you may pay {2}{U} rather than ...")
// and cost-increasers ("cost {1} more").
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cost_reduction',
  axis: 'effect',
  label: 'Reduces costs',
  description: 'Reduces the mana cost of spells or activated abilities.',
  pairsWith: [],
};

// v0.19 — accept single colored mana symbols and hybrid in the cost slot
// (Eluge, the Shoreless Sea: "costs {U} less"). The original `[\dx]+` slot
// only admitted numeric/X. Colored cost reduction is a distinct design class
// (Beseech the Mirror-adjacent designs) and structurally the same as numeric.
const COST_SLOT = '\\{(?:[\\dx]+|[wubrg]|[wubrg]\\/[wubrg]|[\\dx]\\/[wubrg]|2\\/[wubrg])\\}';

const PATTERNS = [
  // Standard cost line: "cost(s) {N} less to cast/activate".
  new RegExp(`\\bcosts?\\s+${COST_SLOT}\\s+less\\b`),
  // "cost(s) up to {N} less" — bounded reducers (Training Grounds template).
  new RegExp(`\\bcosts?\\s+up to\\s+${COST_SLOT}\\s+less\\b`),
  // v0.14.7 — passive-voice "(this|that) cost is reduced by {N}" template
  // (Fugitive Codebreaker, scaling Disguise/Cloak/keyword reducers).
  new RegExp(`\\b(?:this|that)\\s+cost\\s+is\\s+reduced\\s+by\\s+${COST_SLOT}`),
  // v0.30 Group 12 — Affinity for <X> is a printed keyword cost-reducer
  // (Memory Guardian, Voyage Home). Reminder text is stripped, leaving the
  // bare keyword. Subtype slot accepts the canonical Affinity targets
  // (artifacts/equipment/enchantments/lands) plus a generic word fallback.
  /\baffinity for (?:artifacts|enchantments|equipment|lands|[a-z]+)\b/,
];

export const rule: Rule = {
  id: 'effect.cost_reduction',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['cost', 'costs'],
    proximity: ['less'],
    window: 4,
  },
};
