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

// v0.19 — "noncreature or <tribe>" disjunctive descriptor (Harnesser of
// Storms: "Whenever you cast a noncreature or Otter spell"). The intercalated
// tribe partner between "noncreature" and "spell" breaks the contiguous
// anchor; admit a single `or <word>` bridge.
const PATTERNS = [
  new RegExp(`\\bwhenever [\\w\\s']+? cast(?:s|ed)?\\s+(?:a|an|one|another|${ORD})\\s*noncreature(?:\\s+or\\s+\\w+)?\\s+spell\\b`),
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
  // v0.35.0 — Batch 6: admit an optional prepositional-phrase filler between
  // "you cast/control" and the anthem verb (Quandrix, the Proof: "instant
  // and sorcery spells you cast from your hand have cascade"). The filler
  // is bounded to short PP clauses (from|with|under|in <30 chars>); the
  // anchoring verb list (have/has/get/gets/cost/costs) keeps it tight.
  /\b(?:instant\s+and\s+sorcery|sorcery\s+and\s+instant|noncreature)\s+spells?\s+you\s+(?:control|cast)(?:\s+(?:from|with|under|in)\s+[^.]{0,30}?)?\s+(?:have|has|get|gets|cost|costs)\b/,
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
  // v0.35.0 — Batch 6: activation / cast-conditional gate. Burrog Barrage
  // ("if you've cast another instant or sorcery spell this turn") and
  // Potioner's Trove ("Activate only if you've cast an instant or sorcery
  // spell this turn") gate a payoff (creature buff / ability activation) on
  // having already cast a noncreature spell this turn. The gate scales the
  // payoff on noncreature-spell casts and pairs the same way as trigger
  // frames. Anchored tightly on `if|while|as long as` + `you've/have cast`
  // + canonical noncreature-spell descriptor to avoid Counterspell-shape FPs.
  /\b(?:if|while|as long as)\s+you('ve| have)\s+cast\s+(?:an?|another|one)\s+(?:instant\s+or\s+sorcery|sorcery\s+or\s+instant|noncreature)\s+spell\b/,
];

// v0.43.0 — Ironheart FP: "noncreature spells you cast have improvise" fires
// PATTERN 5 (spell-anthem). Improvise/convoke/delve/affinity are cost-reduction
// mechanics on spells, NOT payoffs for casting noncreature spells. Exclude the
// grant frame when the anthem verb is one of these cost keywords. Anthem grants
// of effect keywords (lifelink, cascade, etc.) are preserved.
const COST_KEYWORDS = '(?:improvise|convoke|delve|affinity)';
const NEGATIVE_COST_GRANT = new RegExp(
  `\\bnoncreature spells? you (?:cast|control) (?:have|gain|has)\\s+${COST_KEYWORDS}\\b`,
);

export const rule: Rule = {
  id: 'condition.cares_noncreature_spell',
  axis: 'condition',
  match: (t) => {
    // v0.43.0 — Ironheart FP guard: suppress cost-mechanism keyword grants
    // before running the pattern loop. If the full text matches the cost-grant
    // pattern, scrub that span so PATTERN 5 (spell-anthem) doesn't fire on it.
    const costGrantMatch = NEGATIVE_COST_GRANT.exec(t);
    const scrubbed = costGrantMatch
      ? t.slice(0, costGrantMatch.index) + ' '.repeat(costGrantMatch[0].length) + t.slice(costGrantMatch.index + costGrantMatch[0].length)
      : t;
    for (const p of PATTERNS) {
      const m = scrubbed.match(p);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['noncreature', 'instant', 'sorcery'], proximity: ['cast', 'spell'], window: 6 },
};
