// pipeline/rules/trigger.surveil.ts
//
// Triggers whenever you surveil. Pairs with effect.surveil to form the
// surveil-payoff archetype. Distinct from effect.surveil which tags cards that
// DO the surveiling.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.surveil',
  axis: 'trigger',
  label: 'Surveil trigger',
  description:
    'Triggers whenever you surveil. Pairs with effect.surveil to form the surveil-payoff archetype.',
  pairsWith: ['effect.surveil'],
};

export const rule: Rule = {
  id: 'trigger.surveil',
  axis: 'trigger',
  match: (t) => {
    // "whenever you surveil" — main trigger form
    const wheneverM = t.match(/\bwhenever you surveil\b/);
    if (wheneverM) return { evidence: wheneverM[0] };
    // "the first time you surveil each turn" — milestone variant
    const firstTimeM = t.match(/\bthe first time you surveil\b/);
    if (firstTimeM) return { evidence: firstTimeM[0] };
    // "if you('ve) surveilled/surveiled" — conditional payoff (inflected; MTG uses double-l)
    const ifM = t.match(/\bif you(?:'ve)? surveill?e?d?\b/);
    if (ifM) return { evidence: ifM[0] };
    // "if you surveil this turn" — conditional with uninflected verb
    const ifSurveilM = t.match(/\bif you surveil\b/);
    return ifSurveilM ? { evidence: ifSurveilM[0] } : false;
  },
  nearMiss: { anchors: ['surveil', 'surveiled'], proximity: ['whenever', 'when', 'if'], window: 5 },
};
