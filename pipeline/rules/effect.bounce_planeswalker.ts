// pipeline/rules/effect.bounce_planeswalker.ts
//
// 2026-06-02 audit Wave 2 — the prior PATTERN_BLINK_OWN arm has been removed
// from this rule. It matched "exile <planeswalker> ... return ... to the
// battlefield" frames which are blink (immediate) or flicker (delayed
// end-step), NOT bounce-to-hand. Those cases are now owned by
// `effect.blink` and `effect.flicker`. Mirrors the narrowing applied to
// effect.bounce_creature / effect.bounce_artifact.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_planeswalker',
  axis: 'effect',
  label: 'Bounces a planeswalker to hand',
  description: "Returns a planeswalker to its owner's hand. Exile + return-to-battlefield is owned by effect.flicker (delayed) or effect.blink (immediate).",
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?planeswalkers?(?!\s+card)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached.
// 2026-06-01 audit batch — admit "(up to )?<count> (other )?" count slot
// (Marang River Regent / Sunpearl Kirin family).
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+(?:other\s+)?)?(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+[,\s]+){0,5}nonplaneswalker\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return'], proximity: ['planeswalker', 'permanent', 'hand'], window: 12 },
};
