// pipeline/rules/effect.sacrifice_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_land',
  axis: 'effect',
  label: 'Sacrifices a land',
  description: 'Sacrifices a land as part of its cost or effect.',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:[\w\-]+\s+){0,4}?lands?\b/g;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/g;

// v0.14.1 — span regexes for edict / aristocrats-trigger contexts that should
// NOT be tagged as a controller-side typed sacrifice. Inline copies per
// AGREED PLAN; see effect.sacrifice_artifact.ts for rationale.
// v0.14.6 — punisher edict template (Zoyowa Lava-Tongue).
const NEGATIVE_EDICT = /(?:each|target|an?)\s+opponents?\s+(?:may\s+[^.]{0,40}?\s+or\s+)?sacrifices?/g;
const NEGATIVE_TRIGGER = /\bwhen(?:ever)?\s+(?:you\s+)?sacrifices?|\bwhen(?:ever)?\s+(?:a |an |another )?[\w\s\-]{0,30}?\bis sacrificed/g;
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
  id: 'effect.sacrifice_land',
  axis: 'effect',
  match: (t) => {
    const m = findOutsideNegative(t, PATTERN_OWN) ?? findOutsideNegative(t, PATTERN_BROAD);
    return m ? { evidence: m } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['land', 'permanent'], window: 8 },
};
