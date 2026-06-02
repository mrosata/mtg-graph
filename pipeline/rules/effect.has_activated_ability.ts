// pipeline/rules/effect.has_activated_ability.ts
//
// "This permanent has at least one activated ability" — the enabler side for
// payoffs like Agatha of the Vile Cauldron, Training Grounds, Biomancer's
// Familiar, Mishra/Goldspan, Inspiring Statuary. Originally creature-only;
// broadened in v0.12.2 to all permanent types because the payoff family
// already accepts artifact (Goldspan), enchantment, land (Restless manlands),
// and planeswalker activations. We look for the canonical "cost: effect"
// colon, anchored on a mana symbol in the cost portion so we don't false-
// positive on Saga chapters or other colon-bearing oracle prose.
//
// Spells (Instant/Sorcery) are explicitly EXCLUDED — their "costs" are spell
// costs, not activations.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { normalizeOracleText } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_activated_ability',
  axis: 'effect',
  label: 'Has an activated ability',
  description:
    'This permanent (creature, artifact, enchantment, land, or planeswalker) has at least one activated ability (a "cost: effect" line).',
  pairsWith: ['condition.cares_activated_abilities'],
};

// Activation costs in oracle text always contain at least one mana symbol or
// the {T}/{Q} symbol, possibly followed by additional components ("{1}, {T},
// sacrifice this creature: ..."). Match a mana/tap symbol, allow up to ~100
// characters of additional cost tokens, then require a colon-space.
// 2026-06-01 audit batch — Sidisi, Regent of the Mire: "{T}, Sacrifice a
// creature you control with mana value X other than Sidisi:" — 74 chars
// between `{t}` and `:`. The prior 60-char window cut off the colon. Bumped
// to 100 to admit long restrictive subjects on the sacrifice cost.
const SYMBOL_ACTIVATED_PATTERN = /\{[wubrgcxstq0-9](?:\/[wubrgcps])?\}[^.\n]{0,100}?:\s/;

// Spelled-out non-symbol activation costs (v0.12.9). Some abilities use a cost
// that contains no {mana}/{T} token at all — "Sacrifice another creature: ...",
// "Tap two untapped creatures you control: ...", "Discard a card: ...",
// "Pay 2 life: ...". These are activated abilities by the cost-colon-effect
// frame. We anchor on a SENTENCE START (start of text or after a period) so
// we don't false-positive on prose like "...whenever it dies: gain 2 life".
// The `(?: ?(?:once|twice|N times) )?` arm is omitted on purpose — those
// modifiers attach to "discard"/"sacrifice" only inside specific costs that
// already match the noun-phrase patterns below.
//
// Each arm requires: the literal verb, a noun phrase, then ":" + space within
// a bounded character window (~80). Bounded windows avoid runaway matches that
// could swallow whole paragraphs.
// v0.14.6 — added em-dash prefix ("— ") for ability-word / Case-keyword
// subheaders like "Solved — Sacrifice this Case:" (Case of the Uneaten
// Feast). The em-dash is the canonical separator between a header word
// and the activated-cost clause that follows.
const PROSE_ACTIVATED_PATTERN =
  /(?:^|\.\s|\n|—\s)(?:sacrifice|discard|exile|pay|tap|untap|reveal|remove|return) [^.\n]{0,80}?:\s/i;

const PERMANENT_TYPES = ['Creature', 'Artifact', 'Enchantment', 'Land', 'Planeswalker', 'Battle'];

// v0.14.10 — keyword-based activated abilities whose cost+effect are folded
// into the keyword's reminder text. Reminder text is stripped by
// normalization before any regex runs, so these activations are invisible
// to SYMBOL_ACTIVATED_PATTERN / PROSE_ACTIVATED_PATTERN. Short-circuit on
// the keyword list instead. Only includes battlefield-zone activations:
//   - Equip: "{cost}: Attach to target creature you control."
//   - Crew: "Tap any number of creatures whose total power is N or more:
//           Vehicle becomes a creature until end of turn."
// Excluded on purpose: Cycling (activated from hand), Channel (hand),
// Unearth (graveyard), Flashback (alt-cost, not an activated ability).
// Those zones aren't "this permanent has an activated ability" semantics.
const BATTLEFIELD_ACTIVATED_KEYWORDS = new Set(['Equip', 'Crew']);

// 2026-06-01 audit Group 8 — Suspicious Shambler: graveyard-cost-only
// activation ("{N}, Exile this card from your graveyard: <effect>") must
// NOT fire has_activated_ability — the cost lives in the graveyard zone,
// not on the battlefield. Pre-strip whole activation segments whose cost
// includes "exile (this card|__self__|~) from (your|a) graveyard". This
// preserves Tinybones-style cards that have BOTH a battlefield activation
// and a graveyard activation — only the graveyard line is stripped.
//
// The strip matches "<cost>: " through the next sentence terminator so the
// effect clause leaves with the cost. Sentence terminator includes period
// and end-of-text.
const GRAVEYARD_COST_ACTIVATION_STRIP =
  /[^.]*?\bexile (?:this card|__self__|~) from (?:your|a) graveyard\b[^.]*?:\s[^.]*?(?:\.|$)/gi;

// v0.24 — strip leading keyword tokens from the normalized text.
// Normalization collapses `\n` to space, erasing the boundary between a
// keyword block ("Reach", "Flying, vigilance", "Start your engines!") and
// the first prose-cost activation that follows. The PROSE pattern anchors
// on a sentence-like boundary which a collapsed keyword line doesn't
// provide. Pre-stripping the keyword block restores the `^` anchor.
//
// v0.27.x (Goblin Smuggler) — gate the optional `{cost}` suffix to
// cost-bearing keywords only. Bare evergreens (Haste, Flying, Reach, etc.)
// never take a cost; if we allow `(?:\s*\{[^}]+\})?` for them, the stripper
// will happily eat the FIRST symbol of the activated ability that follows
// (e.g. for "Haste\n{T}: ..." the stripper consumed `Haste {T}`, leaving
// `: another...` — no anchor for SYMBOL_ACTIVATED_PATTERN). Cost-bearing
// keywords (Equip, Ward, Cycling, ...) really do carry a `{cost}` suffix.
const COST_BEARING_KEYWORDS = new Set([
  'equip', 'ward', 'cycling', 'kicker', 'crew', 'reconfigure', 'channel',
  'flashback', 'unearth', 'embalm', 'eternalize', 'transmute', 'suspend',
  'aftermath', 'prowl', 'overload', 'retrace', 'spectacle', 'disturb',
  'encore', 'escape', 'jump-start', 'madness', 'morph', 'ninjutsu',
  'recover', 'replicate', 'scavenge', 'transfigure', 'transmogrify',
  'disguise', 'plot', 'craft', 'prototype', 'impending', 'offspring',
  'mobilize', 'harmonize',
]);

function stripLeadingKeywords(text: string, keywords: string[]): string {
  if (keywords.length === 0) return text;
  // Build a single alternation where each branch is `<kw>(?:\s*\{...\})?`
  // for cost-bearing keywords and `<kw>` (no cost suffix) for bare ones.
  const branches = keywords.map((k) => {
    const lower = k.toLowerCase();
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return COST_BEARING_KEYWORDS.has(lower)
      ? `${escaped}(?:\\s*\\{[^}]+\\})?`
      : escaped;
  });
  const alternation = branches.join('|');
  const leading = new RegExp(
    `^(?:(?:${alternation})(?:\\s*,\\s*)?\\s*)+`,
    'i',
  );
  return text.replace(leading, '');
}

export const rule: Rule = {
  id: 'effect.has_activated_ability',
  axis: 'effect',
  matchCard: (card) => {
    if (!card.types.some((t) => PERMANENT_TYPES.includes(t))) return false;
    const kw = card.keywords.find((k) => BATTLEFIELD_ACTIVATED_KEYWORDS.has(k));
    if (kw) return { evidence: kw.toLowerCase() };
    const normalized = normalizeOracleText(card.oracleText, card.name);
    const graveStripped = normalized.replace(GRAVEYARD_COST_ACTIVATION_STRIP, ' ');
    const stripped = stripLeadingKeywords(graveStripped, card.keywords);
    const m = stripped.match(SYMBOL_ACTIVATED_PATTERN) ?? stripped.match(PROSE_ACTIVATED_PATTERN);
    return m ? { evidence: m[0].trim() } : false;
  },
};
