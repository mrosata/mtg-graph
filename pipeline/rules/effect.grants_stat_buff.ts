// pipeline/rules/effect.grants_stat_buff.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.grants_stat_buff',
  axis: 'effect',
  label: 'Grants stat buff',
  description: 'Grants an anthem-style +N/+N buff to one or more creatures (no counter involved).',
  pairsWith: [],
};

// Matches anthem-style stat buffs: "[creatures|target X] get(s) +N/+N".
// Only positive buffs — negative pumps (e.g. "-3/-3") read as combat tricks/removal.
// `(?:\d+|x)` accepts variable-anthem buffs like Moonshaker Cavalry's "+X/+X
// until end of turn, where X is the number of creatures you control" — same
// anthem axis, just scaled by a count.
// v0.19 — "it" subject admits anaphoric-pronoun anthem grants (Might of the
// Meek: "Target creature gains trample until end of turn. It also gets +1/+0
// until end of turn if you control a Mouse."). The buff and the antecedent
// live in adjacent sentences; the `[^.]{0,40}?` filler is sentence-scoped
// (period excluded) so "it" only matches within a clause that already names
// itself "it" — safe because +N/+N grants on pronoun subjects are highly
// specific to combat-trick / anthem templating.
// v0.30 Group 18 — extended SUBJECT to admit "that <type>" / "that <type>
// or <type>" (Reckless Velocitaur: "that Mount or Vehicle gets +2/+0").
// The anaphor refers back to a subject established earlier in the trigger
// clause; structurally still a stat-buff grant.
// 2026-06-02 audit batch — admit "they each" anaphor (Fancy Footwork:
// "two target creatures. They each get +2/+2"). The "they each" form
// distributes the buff over a plural antecedent established in the
// preceding sentence; structurally still a stat-buff grant.
const PATTERN =
  /(?:creatures?|permanents?|attackers?|blockers?|target [a-z]+(?: [a-z]+)?|that\s+[a-z]+(?:\s+or\s+[a-z]+)?|they\s+(?:each\s+)?|\bit\b)[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)/;

// 2026-06-01 audit batch — Adelbert Steiner: "__self__ gets +1/+1 for each
// Equipment you control". Self-buff scaling on a "for each" axis. The
// existing PATTERN doesn't admit `__self__` as a subject (it scopes to
// other creatures / pronouns). Restrict to `for each` so the self-buff
// isn't a flat anthem — anthem-style self-statics are owned by the
// effect.has_stat_buff axis (intrinsic), not by grants_stat_buff.
const PATTERN_SELF_FOR_EACH =
  /\b__self__\s+gets?\s+\+(?:\d+|x)\/\+(?:\d+|x)\s+for each\b/;

// v0.12.9: tribal-anthem frame — "<tribe>s you control get +N/+N" (Goddric,
// Cloaked Reveler grants "Dragons you control get +1/+0" through a nested
// quoted ability). The subject is a plural noun + "you control" but the noun
// isn't the literal word "creatures". Bounded to keep this from false-
// positiving on prose ("foods you control get …" wouldn't be a stat buff in
// practice because Foods can't have +N/+N applied, so this is acceptably
// narrow). The noun must end in -s/-en to gate on plurals.
// v0.19 — irregular plurals (Bloomburrow Mice/Geese, plus the standard
// English-irregular set) added to the alternation. "Mice you control get
// +1/+0" (Flowerfoot Swordmaster, Mabel) doesn't fit -s/-en suffix gating.
// v0.33+ — kithkin added (Champion of the Clachan). Like merfolk, kithkin
// is an irregular plural with no -s/-en suffix.
const TRIBAL_PATTERN =
  /\b(?:[a-z]+(?:s|en)|merfolk|kithkin|mice|geese|dwarves|elves|wolves|men|women|fungi|axolotls)\s+you\s+control[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)/;

export const rule: Rule = {
  id: 'effect.grants_stat_buff',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(TRIBAL_PATTERN) ?? t.match(PATTERN_SELF_FOR_EACH);
    return m ? { evidence: m[0] } : false;
  },
};
