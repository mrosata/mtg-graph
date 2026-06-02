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
//
// 2026-06-01 audit batch — strip "named <X>" clauses before matching so
// Dragonstorm Forecaster ("search your library for a card named Dragonstorm
// Globe or Boulderborn Dragon") doesn't FP tutors_subtype.dragon on the
// word "Dragon" inside a named-card lookup. The card is tutoring two
// specific cards by name, not tutoring "a Dragon card". The strip is
// family-wide — generalises to every tutors_subtype.<X> rule against
// named-card lookups. The clause runs from "named " to the next sentence
// terminator (period or end-of-text); intervening "or"/"and" connecting
// alternative names are consumed too.
const NAMED_CLAUSE = /\bnamed\s+[^.,;:]*/g;

function makeRule(subtype: string): Rule {
  // v0.33+ — admit "searches" third-person template alongside "search".
  const re = new RegExp(
    `search(?:es)?\\s+[^.]{0,40}? library for [^.]{0,80}?\\b${subtypePattern(subtype)}\\b`,
  );
  return {
    id: `effect.tutors_subtype.${subtype}`,
    axis: 'effect',
    match: (t) => {
      const stripped = t.replace(NAMED_CLAUSE, 'named X');
      const m = stripped.match(re);
      return m ? { evidence: m[0] } : false;
    },
  };
}

export const rules: Rule[] = THEME_SUBTYPES.map(makeRule);
