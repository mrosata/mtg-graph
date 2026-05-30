// pipeline/rules/effect.sacrifice_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_artifact',
  axis: 'effect',
  label: 'Sacrifices an artifact',
  description: 'Sacrifices an artifact as part of its cost or effect. Includes broad "sacrifice a permanent" phrasing.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?artifacts?\b/g;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonartifact\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/g;

// Artifact-subtype sacrifice — "Sacrifice a Food", "Sacrifice three Treasures",
// etc. All of these subtypes denote permanents whose card type is Artifact, so
// the sac IS an artifact sacrifice and should fire this tag for graph edges.
// v0.14.9 — added "this" determiner (Knife: "sacrifice this Equipment").
// Common self-sac shape on Equipment / Vehicle / Food / Treasure / Map /
// Blood / Clue.
const PATTERN_SUBTYPE =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|this\s+|X\s+|\d+\s+|two\s+|three\s+|four\s+)?(?:food|treasure|clue|map|blood|powerstone|equipment|vehicle|junk|shard|gold|incubator|attraction|contraption)s?\b/g;

// Self-sac as activation cost ("Sacrifice __SELF__:") on an artifact card.
// Text-only matching misses these because the post-normalization "__self__"
// doesn't carry the type info. The matchCard branch fills the gap by ANDing
// type_line.Artifact with self-sac text.
const SELF_SAC = /\bsacrifices?\s+__self__\b/;
// Anaphoric self-sac: "...on __SELF__, sacrifice it..." (Millennium Calendar).
// Requires __SELF__ to be established earlier in the same clause so "it"
// unambiguously refers to the card itself.
const ANAPHORIC_SELF_SAC = /\bsacrifices?\s+it\b/;

// v0.14.1 — span regexes for edict / aristocrats-trigger contexts that should
// NOT be tagged as a controller-side typed sacrifice. Inline copies (not a
// shared helper) per AGREED PLAN — they consume "sacrifice" themselves, so a
// normalize-layer mask would also break effect.edict.ts and
// trigger.permanent_sacrificed.ts.
//   NEGATIVE_EDICT: "(each|target|an?) opponent(s) sacrifice(s)" — covers
//     Throne of the Grim Captain, Tithing Blade.
//   NEGATIVE_TRIGGER: "whenever (you) sacrifice(s)" and "when(ever) X is
//     sacrificed" — covers Vito, Fanatic of Aclazotz.
// v0.14.6 — punisher edict template (Zoyowa Lava-Tongue): "each opponent may
// discard a card or sacrifice a permanent". Extend NEGATIVE_EDICT to span
// from "each opponent" through the "sacrifice" verb so typed-sac patterns
// suppress correctly.
const NEGATIVE_EDICT = /(?:each|target|an?)\s+opponents?\s+(?:may\s+[^.]{0,40}?\s+or\s+)?sacrifices?/g;
const NEGATIVE_TRIGGER = /\bwhen(?:ever)?\s+(?:you\s+)?sacrifices?|\bwhen(?:ever)?\s+(?:a |an |another )?[\w\s\-]{0,30}?\bis sacrificed/g;
// v0.14.31 — "unless they sacrifice" punisher frame (Polygraph Orb shape).
const NEGATIVE_UNLESS = /(?:each|target|an?)\s+opponents?\s+[^.]{0,80}?\bunless\s+(?:they|he or she|that player)\s+(?:[^.]{0,40}?\s+or\s+)?sacrifices?/g;

function collectNegativeSpans(t: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const m of t.matchAll(NEGATIVE_EDICT)) {
    if (m.index !== undefined) spans.push([m.index, m.index + m[0].length]);
  }
  for (const m of t.matchAll(NEGATIVE_TRIGGER)) {
    if (m.index !== undefined) spans.push([m.index, m.index + m[0].length]);
  }
  for (const m of t.matchAll(NEGATIVE_UNLESS)) {
    if (m.index !== undefined) spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

function findOutsideNegative(t: string, re: RegExp): string | null {
  const spans = collectNegativeSpans(t);
  for (const m of t.matchAll(re)) {
    if (m.index === undefined) continue;
    const inside = spans.some(([s, e]) => m.index! >= s && m.index! < e);
    if (!inside) return m[0];
  }
  return null;
}

export const rule: Rule = {
  id: 'effect.sacrifice_artifact',
  axis: 'effect',
  match: (t) => {
    const m =
      findOutsideNegative(t, PATTERN_OWN) ??
      findOutsideNegative(t, PATTERN_BROAD) ??
      findOutsideNegative(t, PATTERN_SUBTYPE);
    return m ? { evidence: m } : false;
  },
  matchCard: (card, text) => {
    if (!card.types.includes('Artifact')) return false;
    const direct = text.match(SELF_SAC);
    if (direct) return { evidence: direct[0] };
    // Anaphoric "sacrifice it" only fires when __SELF__ appeared earlier in
    // the text (so "it" unambiguously refers back to the card itself).
    const anaphor = text.match(ANAPHORIC_SELF_SAC);
    if (anaphor && anaphor.index !== undefined && text.lastIndexOf('__self__', anaphor.index) !== -1) {
      return { evidence: anaphor[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['artifact', 'permanent'], window: 8 },
};
