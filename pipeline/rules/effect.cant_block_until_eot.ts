// pipeline/rules/effect.cant_block_until_eot.ts
//
// Single-turn block-disable — the Falter / Frenzied Goblin family. Lighter
// sibling of `effect.pacify` (which is permanent lockdown via "can't attack or
// block" with no eot/this-turn modifier). Aggro/red push effect that opens
// the combat step on the attacking player's turn.
//
// Anti-axis: `effect.unblockable` ("this creature can't be blocked") — that's
// the attacker-side license, not the blocker-side restriction.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cant_block_until_eot',
  axis: 'effect',
  label: "Target creature can't block this turn",
  description:
    "Prevents a target creature from blocking this turn — Falter / Frenzied Goblin family. Single-turn block-disable, lighter sibling of `effect.pacify` (permanent lockdown).",
  pairsWith: [],
  category: 'theme',
};

// "Target [adjective]? creature[s]? [an opponent controls]? can't block this turn"
// Negative lookbehind on "be " prevents matching "can't be blocked" (the
// unblockable axis) — we anchor on the BLOCK direction, not the BLOCKED form.
// Negative lookbehind on "attack or " prevents matching the pacify form
// "can't attack or block this turn" — that's pacify-tinted, different.
const PATTERN = /\b(?:up to (?:one|two|three) )?target (?:[\w\-]+ )?(?:creatures?|permanents?)(?: an opponent controls)? can'?t block this turn\b/;
// Disallow when the preceding token is "be" (unblockable form) or "or" (pacify
// form "attack or block").
const NEGATIVE_GUARD = /\b(?:be|attack or) block\b/;

export const rule: Rule = {
  id: 'effect.cant_block_until_eot',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m) return false;
    // Reject if the matched span overlaps a "be block" / "attack or block"
    // construction — the PATTERN itself doesn't include those, so a plain
    // match means we're already on the correct axis.
    if (NEGATIVE_GUARD.test(m[0])) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ["can't block"], proximity: ['target', 'creature', 'this turn'], window: 4 },
};
