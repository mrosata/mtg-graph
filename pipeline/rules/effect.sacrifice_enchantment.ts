// pipeline/rules/effect.sacrifice_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_enchantment',
  axis: 'effect',
  label: 'Sacrifices an enchantment',
  description: 'Sacrifices an enchantment as part of its cost or effect. Includes broad "sacrifice a permanent" phrasing.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

// Filler `[\w\-]+[,\s]+` accepts comma-and-space so multi-type sac lists
// ("sacrifice an artifact, enchantment, or token" — Bargain phrasing)
// match: the comma after "artifact" is the separator between list items.
// Tempered guard `(?!create\s)` prevents the filler from spanning across a
// "create an aura" clause (Hopeful Vigil / Tales' Token cards' "sacrifice a
// creature, then create an aura" frame), which would otherwise FP now that
// `auras?` is accepted as a target noun.
// Noun alternation `(?:enchantments?|auras?|cases?|sagas?|class|classes|shrines?|rooms?|roles?|backgrounds?)`
// — Auras are an enchantment subtype, so sacrifices targeting an Aura should
// fire this rule (Faunsbane Troll, Eriette's Whisper-style cards). The other
// subtypes cover self-sac enchantment frames like "Sacrifice this Case:" /
// "Sacrifice this Saga:" (Case of the Uneaten Feast, saga finales, Class /
// Room / Shrine / Role / Background self-sac costs).
const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?:(?!create\s)[\w\-]+[,\s]+){0,4}?(?:enchantments?|auras?|cases?|sagas?|class|classes|shrines?|rooms?|roles?|backgrounds?)\b/g;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/g;

// Self-sac as activation/solved cost on an Enchantment card ("Sacrifice
// __SELF__:", "Sacrifice this __SELF__:"). The normalizer replaces the
// card's name (and short segments like "Case" from "Case of the Uneaten
// Feast") with __SELF__, so the printed phrase "Sacrifice this Case" lands
// as "sacrifice this __self__" — the subtype noun is gone after normalize.
// matchCard gates on type_line.Enchantment so we don't FP on artifact /
// creature self-sac. Mirrors effect.sacrifice_artifact's SELF_SAC branch.
const SELF_SAC = /\bsacrifices?\s+(?:this\s+)?__self__\b/;

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
  id: 'effect.sacrifice_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = findOutsideNegative(t, PATTERN_OWN) ?? findOutsideNegative(t, PATTERN_BROAD);
    return m ? { evidence: m } : false;
  },
  matchCard: (card, text) => {
    if (!card.types.includes('Enchantment')) return false;
    const m = text.match(SELF_SAC);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['enchantment', 'permanent'], window: 8 },
};
