// pipeline/rules/effect.bounce_enchantment.ts
//
// 2026-06-02 audit Wave 2 — the prior PATTERN_BLINK_OWN arm has been removed
// from this rule. It matched "exile <enchantment> ... return ... to the
// battlefield" frames which are blink (immediate) or flicker (delayed
// end-step), NOT bounce-to-hand. Those cases are now owned by
// `effect.blink` and `effect.flicker`. Mirrors the narrowing applied to
// effect.bounce_creature / effect.bounce_artifact.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_enchantment',
  axis: 'effect',
  label: 'Bounces an enchantment to hand',
  description: "Returns an enchantment to its owner's hand. Exile + return-to-battlefield is owned by effect.flicker (delayed) or effect.blink (immediate).",
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

// v0.21.0 — count slot admits "one or two" and "up to two" (Get Out:
// "return one or two target creatures and/or enchantments you own to your
// hand"). Filler also admits `/` for "and/or" coordinations. Parallel to
// effect.bounce_creature.
// 2026-06-01 audit batch — Ishgard, the Holy See: add `from … graveyard`
// negative lookahead. "Return up to two target artifact and/or enchantment
// cards from your graveyard to your hand" is graveyard recursion, not
// battlefield bounce.
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-\/]+[,\s]+){0,5}?enchantments?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached.
// 2026-06-01 audit batch — admit "(up to )?<count> (other )?" count slot
// (Marang River Regent / Sunpearl Kirin family).
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+(?:other\s+)?)?(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+[,\s]+){0,5}nonenchantment\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

// FIX 7 (BR-2) — Angelic Destiny: aura with a death-trigger self-bounce.
// "When enchanted creature dies, return this card to its owner's hand." The
// `this card` reference is a self-bounce of the enchantment. Type-gated via
// matchCard to Enchantment so the same templating on a creature (Bramble
// Familiar) doesn't FP this enchantment-axis tag.
const PATTERN_THIS_CARD = /\breturn(?:s)?\s+this card to\s+(?:its owner'?s|your)\s+hand\b/;

export const rule: Rule = {
  id: 'effect.bounce_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  matchCard: (card, t) => {
    if (!card.types.includes('Enchantment')) return false;
    const m = t.match(PATTERN_THIS_CARD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return'], proximity: ['enchantment', 'permanent', 'hand'], window: 12 },
};
