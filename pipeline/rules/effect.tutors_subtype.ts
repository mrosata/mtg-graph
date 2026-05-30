// pipeline/rules/effect.tutors_subtype.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_SUBTYPES, subtypePattern, capitalize } from '../themes';

export const tagDefs: TagDef[] = THEME_SUBTYPES.map((subtype) => ({
  tagId: `effect.tutors_subtype.${subtype}`,
  axis: 'effect',
  label: `Tutors a ${capitalize(subtype)}`,
  description: `Searches library for a ${capitalize(subtype)} card.`,
  pairsWith: [`condition.cares_subtype.${subtype}`],
  category: 'theme',
}));

// "search [you|your]? library for [stuff]? <subtype>[s]"
// We allow up to ~80 chars between "library for" and the subtype to handle "a basic
// land card and a Shrine card" style chained tutors.
function makeRule(subtype: string): Rule {
  const re = new RegExp(
    `search [^.]{0,40}? library for [^.]{0,80}?\\b${subtypePattern(subtype)}\\b`,
  );
  return {
    id: `effect.tutors_subtype.${subtype}`,
    axis: 'effect',
    match: (t) => {
      const m = t.match(re);
      return m ? { evidence: m[0] } : false;
    },
  };
}

export const rules: Rule[] = THEME_SUBTYPES.map(makeRule);
