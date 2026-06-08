// pipeline/rules/effect.counterspell.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.counterspell',
  axis: 'effect',
  label: 'Counters a spell',
  description: 'Counters a target spell on the stack.',
  pairsWith: [],
};

// The verb form ("counter target spell") is what we want.
// The noun form ("+1/+1 counter", "a counter on", "remove a counter")
// is excluded because we require "spell" to follow "counter(s)" within a
// short window, and we anchor on word-initial "counter target" / "counter
// <words> spell".
//
// v0.14.1: dropped `ability` from the alternation. Counter-ability effects
// (Tishana's Tidebinder, Stifle) are a separate axis — the tagDef explicitly
// scopes to "target spell on the stack". A dedicated effect.stifle tag may be
// added later if a second ability-counter card surfaces (AGREED PLAN item 14
// defers it).
// v0.33+ — plural "spells" admitted (Glen Elendra's Answer: "counter all
// spells your opponents control"). The noun-form leak ("+1/+1 counter on")
// is still guarded by the trailing `spell` requirement.
const PATTERN =
  /\bcounters?\s+(?:up to (?:one|two|three|\w+)\s+)?(?:target\s+|all\s+)?(?:[\w\-]+\s+){0,3}?\bspells?\b/;

// 2026-06-01 audit batch — Louisoix's Sacrifice: "counter target activated
// ability, triggered ability, or noncreature spell". Composite-target
// list with comma-separated targets ending in "or <type> spell". The
// "spell" component is in the alternation, so this IS a counterspell. The
// PATTERN can't reach "spell" through 4+ tokens including commas.
const PATTERN_COMPOSITE_LIST =
  /\bcounters?\s+target\s+[\w\-]+\s+ability\s*,\s+[^.]{0,80}?or\s+(?:[\w\-]+\s+){0,3}?spells?\b/;

// v0.39.0 — Aven Interrupter: "exile target spell" / "exile target spell
// an opponent controls" is a counter-via-exile. The spell never resolves,
// so the end result is functionally the same as a counterspell.
const PATTERN_EXILE_SPELL = /\bexile target spell(?:\s+an\s+opponent\s+controls)?\b/;

export const rule: Rule = {
  id: 'effect.counterspell',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_COMPOSITE_LIST) ?? t.match(PATTERN_EXILE_SPELL);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['counter'], proximity: ['spell', 'ability'], window: 6 },
};
