// pipeline/rules/effect.copy_spell.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.copy_spell',
  axis: 'effect',
  label: 'Copies a spell',
  description: 'Creates a copy of a spell.',
  // Copying a spell IS casting in graph terms: the copy goes on the stack
  // and resolves like a real cast, so spell-cast triggers should fire.
  pairsWith: ['trigger.spell_cast'],
};

// "copy [target|that|the] [adjectives] (spell|instant|sorcery)".
// The trailing \b prevents "spellbook" / "spellcraft" partial matches.
// Excludes "copy target creature/permanent" — those belong to
// effect.copy_permanent_token / effect.clone_in_place (v0.14.0 split).
const PATTERN = /\bcopy (?:target |that |the )?(?:[\w\-]+ )?(?:spell|instant|sorcery|instant or sorcery spell|sorcery or instant spell)\b/;

// Pronoun phrasing: "whenever you cast … spell …, copy it" — the antecedent is a
// just-cast spell. We require a "cast" verb and a "spell"-ish noun both in
// proximity to "copy it" so we don't capture "copy it" after a creature/permanent
// antecedent (those belong to effect.copy_permanent_token / clone_in_place).
const CAST_SPELL_THEN_COPY_IT = /\bcast(?:s|ing)?\b[^.]{0,60}?\b(?:instant|sorcery|spell|lesson)s?\b[^.]{0,160}?\bcopy it\b/;
// v0.30 Group 27 — sentence-spanning variant (Mendicant Core, Guidelight):
// "whenever you cast an X spell, you may pay {N}. If you do, copy it."
// The "copy it" sits across a sentence boundary from the cast trigger.
// Uses `[\s\S]` to admit one short intermediate sentence; bounded at 200
// chars from cast→copy to keep scope tight.
const CAST_SPELL_THEN_COPY_IT_SPANNING = /\bwhenever\s+you\s+cast\b[^.]{0,80}?\b(?:instant|sorcery|spell|lesson)s?\b[\s\S]{0,200}?\bcopy it\b/;
const COPY_IT_FOR_EACH_SPELL = /\bcopy it (?:for each|once for each|twice|.{0,40}?\b(?:instant|sorcery|spell)s?\b)/;
// v0.14.22 — "Copy it. You may cast the copy" frame (Reenact the Crime).
// The "Copy it" anaphor refers to a card exiled or referenced earlier; the
// trailing "cast (the|that) copy" clause confirms the copy is a spell —
// you can only `cast` a spell, not a creature in play. Bounded filler so
// we don't bridge unrelated sentences.
// 2026-06-01 audit batch — Shiko, Paragon of the Way: comma-separated
// continuation "copy it, then you may cast the copy" (no period between
// "copy it" and "cast the copy"). Admit comma+then as well as the period.
const COPY_IT_CAST_THE_COPY = /\bcopy it\b[^.]{0,40}?(?:\.\s*|,\s*then\s+)[^.]{0,60}?\bcast (?:the|that) copy\b/;

export const rule: Rule = {
  id: 'effect.copy_spell',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(CAST_SPELL_THEN_COPY_IT) ?? t.match(CAST_SPELL_THEN_COPY_IT_SPANNING) ?? t.match(COPY_IT_FOR_EACH_SPELL) ?? t.match(COPY_IT_CAST_THE_COPY);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['copy'], proximity: ['spell', 'instant', 'sorcery'], window: 6 },
};
