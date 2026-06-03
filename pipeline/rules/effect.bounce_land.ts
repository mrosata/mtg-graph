// pipeline/rules/effect.bounce_land.ts
//
// 2026-06-02 audit Wave 2 — the prior PATTERN_BLINK_OWN arm has been removed
// from this rule. It matched "exile <land> ... return ... to the
// battlefield" frames which are blink (immediate) or flicker (delayed
// end-step), NOT bounce-to-hand. Those cases are now owned by
// `effect.blink` and `effect.flicker`. Mirrors the narrowing applied to
// effect.bounce_creature / effect.bounce_artifact.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_land',
  axis: 'effect',
  label: 'Bounces a land to hand',
  description: "Returns a land to its owner's hand. Exile + return-to-battlefield is owned by effect.flicker (delayed) or effect.blink (immediate).",
  pairsWith: ['trigger.land_leaves_battlefield'],
};

// v0.14.38 — `a|an` determiner added so the OTJ "Archway" cycle's self-bounce
// template ("return a land you control to its owner's hand") matches. The
// existing `another|target|each|all` allowlist missed the entire cycle (Arid
// Archway and partners). Land/typed-land subject still required, so generic
// "return a creature you control to its owner's hand" stays out.
// v0.35.0 — Batch 11: forbid `cards?` inside the pre-noun filler so the
// "exiled with this land" frame can't bridge through a `card` antecedent.
// Northampton Farm ("return each other card exiled with this land to its
// owner's hand") was FPing because the lazy filler consumed "other card
// exiled with this" then satisfied `lands?` on the "land" token. The
// bounced object is "card", not "land". Adding `(?!cards?\s)` at the
// filler entry rejects any filler token starting with "card".
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+)(?:(?!cards?\s)[\w\-]+[,\s]+){0,5}?lands?(?!\s+card)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:a\s+|an\s+|another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return'], proximity: ['land', 'permanent', 'hand'], window: 12 },
};
