// pipeline/rules/condition.cares_energy.ts
//
// Energy spending — `pay {E}` (one or more). Companion to
// `effect.produces_energy`. A "cares about energy" tag in the condition axis
// so the bidirectional pairing crosses axes (effect↔condition allowed).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_energy',
  axis: 'condition',
  label: 'Spends energy',
  description: 'Pays {E} (energy counters) as a cost or scales an effect on the amount of energy spent.',
  pairsWith: ['effect.produces_energy'],
};

// `pay {E}`, `pay {E}{E}`, `pay N {E}`. Energy spend is almost always an
// activation cost; we also admit body uses where the player chooses to pay.
const PATTERN =
  /\bpay (?:(?:an additional\s+)?(?:an?|one or more|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|twenty-five|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|x|\d+)\s+)?\{e\}/;

export const rule: Rule = {
  id: 'condition.cares_energy',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['{e}', 'energy'], proximity: ['pay'], window: 4 },
};
