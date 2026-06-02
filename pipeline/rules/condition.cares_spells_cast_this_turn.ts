// pipeline/rules/condition.cares_spells_cast_this_turn.ts
//
// Jeskai / spell-count axis. "Cast your N-th spell each turn" triggers,
// "number of spells you've cast this turn" scaling, "if you've cast N or
// more spells this turn" gates. Effortless Master, Eshki Dragonclaw,
// Narset Jeskai Waymaster.
//
// Distinct from `trigger.spell_cast` (the per-spell trigger axis) — this is
// the COUNT-based gate / scaling axis that lives alongside it.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_spells_cast_this_turn',
  axis: 'condition',
  label: "Cares about spells cast this turn",
  description:
    "Triggers, scales, or gates on the number / ordinal of spells cast this turn (prowess / magecraft / storm-grant payoff axis).",
  pairsWith: ['trigger.spell_cast'],
};

const PATTERNS = [
  // Ordinal triggers: "whenever you cast your first/second/third [...] spell each turn"
  /\bwhenever (?:you|a player|an opponent) casts? (?:their |your )?(?:first|second|third|fourth|fifth) [\w\s,'-]{0,40}?spell (?:each|this) turn\b/,
  // Threshold gates: "if/as long as/while you've cast two or more spells this
  // turn" (Brightspear Zealot uses "as long as" anchor — same gate axis).
  /\b(?:if|as long as|while) you'?ve cast (?:two|three|four|\d+) or more [\w\s,'-]{0,40}?spells? this turn\b/,
  // Scaling: "number of spells you've cast this turn"
  /\bnumber of [\w\s,'-]{0,40}?spells (?:you'?ve cast|cast) this turn\b/,
  // Compound gate: "if you've cast both a creature spell and a noncreature spell this turn"
  // Admits optional "both " between "cast" and the article (Eshki Dragonclaw).
  /\bif you'?ve cast (?:both )?(?:a|an) [\w\s,'-]{0,40}?spell and (?:a|an) [\w\s,'-]{0,40}?spell this turn\b/,
  // 2026-06-01 audit Group 9 — Thousand-Year Storm storm-scale form:
  // "for each [other] [<typed>] spell[s] you've cast [before it] this turn",
  // also "earlier this turn". This is the count-based scaling axis even
  // without an explicit "number of" framing.
  /\bfor each (?:other )?[\w\s,'-]{0,40}?spells? you'?ve cast (?:before it )?(?:this turn|earlier this turn)\b/,
  // 2026-06-01 audit batch — Sage of the Skies / Focus the Mind: "(if|when)
  // you've cast another spell this turn". This is the count≥2 gate ("you've
  // cast at least one other spell besides this one"). Same axis as the
  // "two or more" threshold gate just templated differently.
  /\b(?:if|when) you'?ve cast another [\w\s,'-]{0,40}?spell this turn\b/,
  // 2026-06-01 audit batch — Highspire Bell-Ringer: "the Nth spell you cast
  // each turn costs ...". Ordinal-scaling cost reduction is the same count
  // axis without a `whenever` verb.
  /\bthe (?:second|third|fourth|fifth) [\w\s,'-]{0,40}?spell you cast each turn\b/,
];

export const rule: Rule = {
  id: 'condition.cares_spells_cast_this_turn',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['spells', 'spell'], proximity: ['cast', 'turn', 'number'], window: 8 },
};
