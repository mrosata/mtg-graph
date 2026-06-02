// pipeline/rules/effect.bounce_artifact.ts
//
// 2026-06-02 audit Wave 2 — the prior PATTERN_BLINK_OWN arm has been removed
// from this rule. It matched "exile <artifact> ... return ... to the
// battlefield" frames which are blink (immediate) or flicker (delayed
// end-step), NOT bounce-to-hand. Those cases are now owned by
// `effect.blink` and `effect.flicker`. This rule's surviving arms ALL
// anchor the destination as "hand". Mirrors the narrowing already applied
// to effect.bounce_creature.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_artifact',
  axis: 'effect',
  label: 'Bounces an artifact to hand',
  description: "Returns an artifact to its owner's hand. Exile + return-to-battlefield is owned by effect.flicker (delayed) or effect.blink (immediate).",
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

// 2026-06-01 audit batch — Ishgard, the Holy See: add `from … graveyard`
// negative lookahead. "Return up to two target artifact and/or enchantment
// cards from your graveyard to your hand" is graveyard recursion (owned by
// effect.return_from_graveyard_to_hand), not battlefield bounce. The
// existing `(?!\s+card)` lookahead didn't catch it because the noun was
// "artifact and/or enchantment cards" with intervening "and/or enchantment"
// tokens between "artifact" and "cards".
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+|this\s+)(?:[\w\-]+[,\s]+){0,5}?(?:artifacts?|equipment|vehicles?)(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// `(?!\s+card)` + graveyard guard reject "return target permanent card from
// your graveyard to your hand" (graveyard recursion, e.g. Coati Scavenger).
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached. Both occurrences of the filler
// updated: the negative lookahead's "nonartifact" gate must also span commas
// so it still rejects "nontoken nonartifact permanent" forms.
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+(?:other\s+)?)?(?:another\s+|target\s+|each\s+|all\s+|this\s+)?(?!(?:[\w\-]+[,\s]+){0,5}nonartifact\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

export const rule: Rule = {
  id: 'effect.bounce_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_RETURN_OWN) ?? t.match(PATTERN_BROAD);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return'], proximity: ['artifact', 'permanent', 'hand'], window: 12 },
};
