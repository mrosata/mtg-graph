// pipeline/rules/effect.blink.ts
//
// Blink: exile a permanent (typically a creature) and IMMEDIATELY return
// it to the battlefield under its owner's control — in the same step,
// no delayed trigger. Re-triggers ETB. Distinct from `effect.flicker`
// (return at next end step) and `effect.bounce_creature` (return to hand).
//
// Canonical templating is "exile X, then return it to the battlefield"
// (comma + "then") or "exile X. return it to the battlefield" (period +
// return). The absence of an "at the beginning of the next end step" /
// "next turn" tail is what separates blink from flicker; the negative
// lookahead enforces that.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.blink',
  axis: 'effect',
  label: 'Blinks a creature (immediate return)',
  description:
    'Exiles a creature and immediately returns it to the battlefield under its owner\'s control. Re-triggers ETB. Distinct from `effect.flicker` (delayed return at next end step) and `effect.bounce_creature` (return to hand).',
  category: 'theme',
  pairsWith: [],
};

// Canonical "exile <creature>, then return ..." or "exile <creature>. return ..."
// — verb-adjacent, no end-step delay. Negative lookahead rejects "at the
// beginning of the next end step / next turn" anywhere in the matched span
// (that's flicker).
const PATTERN_NAMED =
  /\bexile\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+\s+){0,5}?creatures?\b(?![^.]*?\bat the beginning of the (?:next end step|next turn|next player'?s end step))[^.]*?(?:,\s*then\s+return|\.\s*return)\s+(?:it|them|that card|that creature)\s+to the battlefield/;

// Pronoun-anchored blink: "whenever a creature ... deals combat damage ...,
// you may exile it, then return it to the battlefield". The "it" antecedent
// is the creature in the trigger clause. Gated on "creature" appearing
// earlier in the same sentence so artifact/enchantment flickers don't leak.
// Negative lookahead excludes flicker (delayed end-step return).
const PATTERN_PRONOUN =
  /\bcreature[^.]{1,160}?\bexile\s+(?:it|them)\b(?![^.]*?\bat the beginning of the (?:next end step|next turn|next player'?s end step))[,.]\s*(?:then\s+)?return\s+(?:it|them)\s+to the battlefield/;

const PATTERNS: ReadonlyArray<RegExp> = [PATTERN_NAMED, PATTERN_PRONOUN];

// Flicker tail that must NOT immediately follow the match (within ~80 chars).
// The regex lookaheads use `[^.]` and so cannot peer past a period; this
// post-match check inspects the full text near the match index.
const FLICKER_TAIL = /\bat the beginning of the (?:next end step|next turn|next player'?s end step)\b/;

export const rule: Rule = {
  id: 'effect.blink',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = re.exec(t);
      if (!m) continue;
      const span = m[0];
      const endIdx = (m.index ?? 0) + span.length;
      // Look at the matched span plus ~80 chars after it for a flicker tail.
      // Stops at the next period+space — a flicker tail in a later, unrelated
      // sentence doesn't disqualify the blink.
      const trailing = t.slice(endIdx, endIdx + 120);
      const trailingClause = trailing.split(/\.\s/)[0] ?? trailing;
      if (FLICKER_TAIL.test(span) || FLICKER_TAIL.test(trailingClause)) continue;
      return { evidence: span };
    }
    return false;
  },
  nearMiss: {
    anchors: ['exile', 'return'],
    proximity: ['battlefield', 'then'],
    window: 8,
  },
};
