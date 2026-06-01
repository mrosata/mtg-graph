// pipeline/rules/effect.flicker.ts
//
// Flicker: exile a permanent (typically a creature) and return it to the
// battlefield AT THE BEGINNING OF THE NEXT END STEP (or next turn). This is
// the delayed-return variant of "blink" — the creature is gone for the
// remainder of the turn, then re-enters via a delayed trigger. Distinct
// from `effect.blink` (immediate return) and `effect.bounce_creature`
// (return to hand). Also distinct from delayed bounce-back to HAND
// (Anzrag's Rampage style), which is bounce.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.flicker',
  axis: 'effect',
  label: 'Flickers a creature (delayed return)',
  description:
    'Exiles a creature (or permanent) and returns it to the battlefield at the beginning of the next end step or next turn. Re-triggers ETB on return. Distinct from `effect.blink` (immediate return) and `effect.bounce_creature` (return to hand).',
  category: 'theme',
  pairsWith: [],
};

// Tight form — exile + return in adjacent / nearby clauses with explicit
// "at the beginning of the next end step / next turn" delayed trigger.
const PATTERN_TIGHT =
  /\bexile\s+(?:another\s+|target\s+|up to\s+(?:one|two|three)\s+(?:other\s+)?(?:target\s+)?|each\s+|all\s+)?(?:[\w\-]+\s+){0,5}?(?:creature|permanent|artifact|enchantment)s?\b[^.]*?\.\s*return\s+(?:it|them|that card|that creature|those cards|those creatures)\s+to the battlefield[^.]{0,80}?\bat the beginning of the (?:next end step|next turn|next player'?s end step)\b/;

// Sentence-bridged form — exile and return separated by one or more
// intervening sentences (e.g. Niko, Light of Hope's token-copy clause).
// Same delayed-trigger anchor keeps this tight.
const PATTERN_BRIDGED =
  /\bexile\s+(?:another\s+|target\s+|up to\s+(?:one|two|three)\s+(?:other\s+)?(?:target\s+)?|each\s+|all\s+)?(?:[\w\-]+\s+){0,5}?(?:creature|permanent|artifact|enchantment)s?\b[^.]*\.[^.]{0,250}?(?:\.[^.]{0,250}?)*\breturn\s+(?:it|them|that card|that creature)\s+to the battlefield(?:\s+under\s+(?:its|their|your)\s+(?:owner'?s\s+)?control)?\s+at\s+the\s+beginning\s+of\s+the\s+(?:next end step|next turn|next player'?s end step)\b/;

const PATTERNS: ReadonlyArray<RegExp> = [PATTERN_TIGHT, PATTERN_BRIDGED];

export const rule: Rule = {
  id: 'effect.flicker',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (!m) continue;
      // Reject "return ... to your hand" — that's a delayed bounce-to-hand,
      // not flicker (Anzrag's Rampage). The PATTERN regex anchors on
      // "return ... to the battlefield" already, but defense-in-depth:
      // explicitly check the matched span contains "battlefield".
      if (!/battlefield/.test(m[0])) continue;
      return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['exile', 'return'],
    proximity: ['battlefield', 'end step', 'next turn'],
    window: 12,
  },
};
