// pipeline/rules/effect.partial_unblockable.ts
//
// "Can't be blocked by <restriction>" / "can't be blocked except by
// <restriction>" — partial unblockability. Distinct from `effect.unblockable`
// (which is full unblockability, "can't be blocked" with no qualifier) and
// from blocker-restriction gates ("creatures with X can't block").
//
// Standard members include power-gated unblocks (Cheeky House-Mouse,
// Stormkeld Vanguard, Verdant Outrider, Cavern Stomper, Azure Beastbinder,
// Stingerback Terror), color/type-gated partial unblocks, and menace-style
// "except by two or more creatures" framings.
//
// Reminder text is stripped pre-tagging, so cards with bare keyword Menace
// (whose partial unblock lives only in the parenthetical reminder) don't
// fire here — their evasion axis is captured by `effect.has_menace`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.partial_unblockable',
  axis: 'effect',
  label: 'Partial unblockability',
  description:
    "Has \"can't be blocked by <restriction>\" or \"can't be blocked except by <restriction>\" — a conditional evasion narrower than full unblockability. Power-gated, color-gated, count-gated, or tribe-gated forms.",
  // Partial unblock is evasion-adjacent; same axis as full unblockable's
  // pairing with cares_evasion.
  pairsWith: ['condition.cares_evasion'],
};

// Anchor: "can't be blocked" followed by "by" or "except by" — the qualifier
// is what distinguishes partial from full unblockability.
const PATTERN = /\bcan't be blocked (?:by|except by)\b/;

export const rule: Rule = {
  id: 'effect.partial_unblockable',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['blocked'], proximity: ['by', 'except', 'power', 'creatures'], window: 6 },
};
