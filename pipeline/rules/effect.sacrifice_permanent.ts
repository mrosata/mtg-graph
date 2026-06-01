// pipeline/rules/effect.sacrifice_permanent.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_permanent',
  axis: 'effect',
  label: 'Sacrifices any permanent',
  description: 'Sacrifices a permanent without type restriction. Type-specific sacrifice is tagged on the typed children (effect.sacrifice_creature / _artifact / _enchantment / _planeswalker / _land).',
  pairsWith: ['trigger.permanent_leaves_battlefield'],
  children: [
    'effect.sacrifice_creature',
    'effect.sacrifice_artifact',
    'effect.sacrifice_enchantment',
    'effect.sacrifice_planeswalker',
    'effect.sacrifice_land',
  ],
};

const PATTERN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/g;

// v0.14.1 — span regexes for edict / aristocrats-trigger contexts that should
// NOT be tagged as a controller-side typed sacrifice. Inline copies per
// AGREED PLAN; see effect.sacrifice_artifact.ts for rationale.
// v0.14.6 — punisher edict template (Zoyowa Lava-Tongue).
// Wave-2 Win 6 (2026-06-01) — Pox Plague: multi-clause edict (see
// effect.sacrifice_artifact.ts header). Bridge across `, then ...` lists,
// admit `players?` alongside `opponents?`.
const NEGATIVE_EDICT = /(?:each|target|an?)\s+(?:opponents?|players?)\s+(?:[^.]{0,180}?\bsacrifices?|(?:may\s+[^.]{0,40}?\s+or\s+)?sacrifices?)/g;
// Wave-2 Win 6 (Zodiark, Umbral God) — observer trigger frame "whenever a
// player sacrifices ...".
const NEGATIVE_TRIGGER = /\bwhen(?:ever)?\s+(?:you|(?:a|an|each|any|another)\s+(?:players?|opponents?))\s+sacrifices?|\bwhen(?:ever)?\s+(?:a |an |another )?[\w\s\-]{0,30}?\bis sacrificed/g;
// v0.14.31 — "unless they sacrifice" punisher frame (Polygraph Orb shape).
const NEGATIVE_UNLESS = /(?:each|target|an?)\s+opponents?\s+[^.]{0,80}?\bunless\s+(?:they|he or she|that player)\s+(?:[^.]{0,40}?\s+or\s+)?sacrifices?/g;
// v0.14.36 — Ward action-cost suffix (Vein Ripper-shape): paid by the
// opponent targeting this card, not by the controller.
const NEGATIVE_WARD = /\bward\s*[—\-]\s*sacrifices?\s+[^.\n]*/g;

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
  for (const m of t.matchAll(NEGATIVE_WARD)) {
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
  id: 'effect.sacrifice_permanent',
  axis: 'effect',
  match: (t) => {
    const m = findOutsideNegative(t, PATTERN);
    return m ? { evidence: m } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['permanent'], window: 8 },
};
