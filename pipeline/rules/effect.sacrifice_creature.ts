// pipeline/rules/effect.sacrifice_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.sacrifice_creature',
  axis: 'effect',
  label: 'Sacrifices a creature',
  description: 'Sacrifices a creature as part of its cost or effect. Includes broad "sacrifice a permanent" phrasing.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield'],
};

// Negative lookahead `(?!aura\b)` after the determiner blocks "sacrifice an
// aura attached to this creature" (Faunsbane Troll) — the noun being
// sacrificed is the Aura, with "creature" appearing only as a modifier.
const PATTERN_OWN =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+|\w+\s+)(?!auras?\b)(?:[\w\-]+\s+){0,4}?creatures?\b/g;

const PATTERN_BROAD =
  /\bsacrifice(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+|X\s+)(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/g;

// v0.14.1 — span regexes for edict / aristocrats-trigger contexts that should
// NOT be tagged as a controller-side typed sacrifice. Inline copies (not a
// shared helper) per AGREED PLAN — they consume "sacrifice" themselves, so a
// normalize-layer mask would also break effect.edict.ts and
// trigger.permanent_sacrificed.ts.
// v0.14.6 — punisher edict template (Zoyowa Lava-Tongue).
const NEGATIVE_EDICT = /(?:each|target|an?)\s+opponents?\s+(?:may\s+[^.]{0,40}?\s+or\s+)?sacrifices?/g;
const NEGATIVE_TRIGGER = /\bwhen(?:ever)?\s+(?:you\s+)?sacrifices?|\bwhen(?:ever)?\s+(?:a |an |another )?[\w\s\-]{0,30}?\bis sacrificed/g;
// v0.14.31 — "unless they sacrifice" punisher (Polygraph Orb): "Each opponent
// loses 3 life unless they discard a card or sacrifice a creature." Same
// edict semantic as the "may X or sacrifice" punisher (Zoyowa) — the
// controller never sacrifices; the opponent gets a forced choice. The span
// bridges the opponent subject through the `unless they (X or)? sacrifice`
// clause.
const NEGATIVE_UNLESS = /(?:each|target|an?)\s+opponents?\s+[^.]{0,80}?\bunless\s+(?:they|he or she|that player)\s+(?:[^.]{0,40}?\s+or\s+)?sacrifices?/g;
// v0.14.36 — Ward action-cost suffix (Vein Ripper-shape): "Ward—Sacrifice a
// creature." Ward is paid by the OPPONENT targeting this card, not by the
// controller. The span covers `ward—sacrifice ...` through end-of-sentence
// so typed-sac patterns inside the Ward cost suppress correctly. Em-dash
// (U+2014) and ASCII hyphen both admitted.
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

// Self-sacrifice via pronoun "it" — Rotisserie Elemental, Attack-in-the-Box,
// and the Mobilize cycle. Type-gated in `matchCard` to a Creature card so
// "sacrifice it" on a Land (Public Thoroughfare) doesn't FP.
const PATTERN_SELF_PRONOUN = /\bsacrifice(?:s)?\s+it\b/;

// v0.13.1 — token-subtype sacrifice. The Apprentice's Folly shape: the same
// oracle text creates a creature token of subtype X earlier, then later says
// "sacrifice ... X(s)". Contextual lookup (rather than a hard-coded subtype
// whitelist) so it generalizes to any creature-type token a card invents.
//
// Why contextual not whitelist:
//   - A whitelist (Spirit, Reflection, Saproling, …) needs maintenance and
//     still risks FPs on hate-bear cards that mention "sacrifice a Goblin"
//     without producing them (e.g. tribal hosers).
//   - Requiring same-text token creation gates the broadening to the
//     self-token-sac shape it's meant to capture and rejects external-
//     reference sacrifices.
//
// Token-subtype is extracted from two frames:
//   (a) "<n>/<n> [...] (subtype) creature token" — explicit creature token
//       with a typed slot. Captures e.g. "1/1 white spirit creature token".
//   (b) "is a (subtype) in addition to" — copy-token reassign-types frame.
//       Captures the Apprentice's Folly "is a reflection in addition to its
//       other types" pattern.
// The sacrifice clause must literally reference the subtype: "sacrifice (a |
// an | all | each | two | three | X )?<subtype>s?\b". The "you control"
// trailer is allowed but not required (handles "sacrifice a spirit:" cost
// shape as well as "sacrifice all reflections you control").
const TOKEN_CREATE_TYPED =
  /\bcreates?\s+(?:a|an|two|three|four|five|six|seven|eight|nine|ten|\d+|x)\s+[^.]{0,80}?\b\d+\/\d+\b[^.]{0,40}?\b([a-z]+)\s+creature\s+tokens?/g;
const TOKEN_REASSIGN_TYPE =
  /\bis\s+a\s+([a-z]+)\s+in\s+addition\s+to\s+its\s+other\s+types/g;

function collectTokenSubtypes(t: string): Set<string> {
  const out = new Set<string>();
  for (const m of t.matchAll(TOKEN_CREATE_TYPED)) {
    const word = m[1];
    if (word && word !== 'creature' && word !== 'colorless') out.add(word);
  }
  for (const m of t.matchAll(TOKEN_REASSIGN_TYPE)) {
    const word = m[1];
    if (word) out.add(word);
  }
  return out;
}

function matchTokenSubtypeSac(t: string): { evidence: string } | false {
  const subtypes = collectTokenSubtypes(t);
  if (subtypes.size === 0) return false;
  for (const sub of subtypes) {
    const re = new RegExp(
      `\\bsacrifice(?:s)?\\s+(?:a\\s+|an\\s+|all\\s+|each\\s+|two\\s+|three\\s+|four\\s+|x\\s+|\\d+\\s+)?${sub}s?\\b`,
    );
    const m = t.match(re);
    if (m) return { evidence: m[0] };
  }
  return false;
}

// v0.14.24 — temporary-reanimate anaphor. Push // Pull and the wider
// reanimate-then-sacrifice family bind a "creature card(s)" antecedent and
// later schedule a delayed sacrifice of that bound creature via the
// pronoun "them" / "it" / "those". The antecedent gate ("creature card"
// must appear earlier in oracle text) keeps the broadening narrow:
// non-creature reanimation ("search for an artifact card ... sacrifice it")
// or unrelated "sacrifice them" frames (lands, etc.) won't fire.
const PATTERN_ANAPHOR_SAC = /\bsacrifice(?:s)?\s+(?:them|it|those(?:\s+creatures?)?)\b/;

function matchAnaphoricReanimateSac(t: string): { evidence: string } | false {
  if (!/\bcreatures?\s+cards?\b/.test(t)) return false;
  const m = t.match(PATTERN_ANAPHOR_SAC);
  return m ? { evidence: m[0] } : false;
}

export const rule: Rule = {
  id: 'effect.sacrifice_creature',
  axis: 'effect',
  match: (t) => {
    const m = findOutsideNegative(t, PATTERN_OWN) ?? findOutsideNegative(t, PATTERN_BROAD);
    if (m) return { evidence: m };
    return matchTokenSubtypeSac(t) || matchAnaphoricReanimateSac(t);
  },
  matchCard: (card, t) => {
    if (!card.types.includes('Creature')) return false;
    const m = t.match(PATTERN_SELF_PRONOUN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['creature', 'permanent'], window: 8 },
};
