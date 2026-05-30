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
const PATTERN =
  /\bcounters?\s+(?:up to (?:one|two|three|\w+)\s+)?(?:target\s+)?(?:[\w\-]+\s+){0,3}?\bspell\b/;

export const rule: Rule = {
  id: 'effect.counterspell',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['counter'], proximity: ['spell', 'ability'], window: 6 },
};
