// pipeline/rules/condition.cares_noncreature_spell.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_noncreature_spell',
  axis: 'condition',
  label: 'Cares about noncreature spells',
  description: 'Triggers or scales off casting noncreature (instant/sorcery) spells.',
  pairsWith: ['trigger.spell_cast', 'effect.cast_noncreature_spell'],
};

// Phrasings:
//   "whenever you cast a noncreature spell, ..."
//   "whenever you cast an instant or sorcery (spell), ..."
//   "whenever you cast a sorcery or instant, ..."
//   "when you next cast an instant or sorcery..." (Gadwick's First Duel Saga III)
//   "instant and sorcery spells you control have/get/cost..." (Heartflame Duelist)
// The leading "whenever <subject> cast(s|ed) ..." structure deliberately
// excludes both "search your library for an instant or sorcery" (look, don't
// cast) and the self-cast "whenever you cast this spell" (lacks the noncreature
// / instant-or-sorcery descriptor).
// Ordinal/per-turn qualifier between "cast" and the determiner-then-spell
// descriptor. Covers Aquatic Alchemist // Bubble Up's "your first instant or
// sorcery spell each turn" and the parallel "your second", "the third", etc.
// Slot is optional (regular "cast a/an" still falls through to the patterns
// that don't include this prefix arm).
const ORD = '(?:your|the)\\s+(?:first|second|third|fourth|fifth|next)\\s+';

const PATTERNS = [
  new RegExp(`\\bwhenever [\\w\\s']+? cast(?:s|ed)?\\s+(?:a|an|one|another|${ORD})\\s*noncreature\\s+spell\\b`),
  new RegExp(`\\bwhenever [\\w\\s']+? cast(?:s|ed)?\\s+(?:a|an|one|another|${ORD})\\s*instant\\s+(?:spell\\s+)?or\\s+sorcery\\b`),
  new RegExp(`\\bwhenever [\\w\\s']+? cast(?:s|ed)?\\s+(?:a|an|one|another|${ORD})\\s*sorcery\\s+(?:spell\\s+)?or\\s+instant\\b`),
  // v0.14.1 — instant-only / sorcery-only triggers. Ojer Pakpatiq:
  // "whenever you cast an instant spell from your hand". The subtype-restricted
  // form is still a noncreature-spell payoff.
  new RegExp(`\\bwhenever [\\w\\s']+? cast(?:s|ed)?\\s+(?:a|an|one|another|${ORD})\\s*(?:instant|sorcery)\\s+spell\\b`),
  // "When you next cast / when the next time you cast" — Saga III triggers,
  // copy-next-spell effects (Gadwick's First Duel).
  /\bwhen (?:you next|the next time you) cast\s+(?:a|an|one)?\s*(?:instant\s+(?:spell\s+)?or\s+sorcery|sorcery\s+(?:spell\s+)?or\s+instant|noncreature\s+spell)\b/,
  // Spell-anthem framings: "instant and sorcery spells you control have/get/cost X"
  // (Heartflame Duelist's "Instant and sorcery spells you control have lifelink").
  // "you cast" added alongside "you control" — Mocking Sprite's cost-reduction
  // frame ("instant and sorcery spells you cast cost {1} less") gates on the
  // SAME spell axis (noncreature-spell casts) and should pair the same way.
  /\b(?:instant\s+and\s+sorcery|sorcery\s+and\s+instant|noncreature)\s+spells?\s+you\s+(?:control|cast)\s+(?:have|has|get|gets|cost|costs)\b/,
  // Spell-as-trigger-subject framings: "whenever an instant or sorcery spell
  // you control ... <verb>" (Imodane the Pyrohammer, also several spell-
  // resolves/spell-deals-damage triggers). The trigger gates on a SPELL rather
  // than on a cast event, so the "cast" anchor doesn't help. Bounded by 80
  // chars to keep this from swallowing unrelated text.
  /\bwhenever\s+(?:a|an|another)\s+(?:instant\s+(?:spell\s+)?or\s+sorcery|sorcery\s+(?:spell\s+)?or\s+instant|noncreature)\s+spell\s+you\s+(?:control|cast)\b/,
  // v0.14.30 — Melek, Reforged Researcher: "The first instant or sorcery
  // spell you cast each turn costs {3} less to cast." Non-trigger anthem
  // frame with an ordinal qualifier ("the first/second/third/each ...").
  // The existing Pattern 6 anthem only matched the "and" descriptor; ordinal
  // qualifiers naturally use "or" ("the first instant or sorcery spell").
  // The cost-reduction / spell-anthem axis pairs the same way.
  /\b(?:the|each|your)\s+(?:first|second|third|fourth|fifth|next)?\s*(?:instant\s+(?:spell\s+)?or\s+sorcery|sorcery\s+(?:spell\s+)?or\s+instant|noncreature)\s+spell\s+you\s+cast\b/,
];

export const rule: Rule = {
  id: 'condition.cares_noncreature_spell',
  axis: 'condition',
  match: (t) => {
    for (const p of PATTERNS) {
      const m = t.match(p);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['noncreature', 'instant', 'sorcery'], proximity: ['cast', 'spell'], window: 6 },
};
