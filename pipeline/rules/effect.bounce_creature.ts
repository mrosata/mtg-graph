// pipeline/rules/effect.bounce_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_creature',
  axis: 'effect',
  label: 'Bounces or blinks a creature',
  description: 'Returns a creature to hand, or exiles and returns it (re-triggering ETB).',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield', 'trigger.another_creature_etb'],
};

// Matches "return target creature to its owner's hand",
// "return target attacking creature to your hand",
// "return up to two target creatures to their owners' hands".
// Explicitly rejects "noncreature" and "creature card" (graveyard recursion).
// The `(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyard)`
// guard rejects "return target creature ... from <a/your/their/an opponent's>
// graveyard to ... hand" — that's reanimate-to-hand, covered by
// `effect.return_from_graveyard_to_hand`, not bounce.
// v0.14.9 — "up to <count> [other] " admits the Hotshot Investigators frame
// "return up to one other target creature to its owner's hand" — "other"
// excludes __SELF__ from valid targets but the bounce semantic is unchanged.
// v0.14.10 — "this " determiner admits self-bounce (Bramble Familiar's
// "Return this creature to its owner's hand" activated ability, Fleeting
// Effigy's end-step trigger). Self-bounce re-triggers ETB and is
// mechanically a bounce.
// v0.21.0 — count slot admits "one or two" and "up to two" (Get Out:
// "return one or two target creatures and/or enchantments you own to your
// hand"). The "and/or enchantments" coordinated form is handled
// automatically — the object-type gate is `creatures?` and the regex matches
// each disjunct independently (the parallel bounce_enchantment rule fires
// for the enchantment side).
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+(?:other\s+)?)?(?:this\s+|another\s+|target\s+|those\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?creatures?\b(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)\s[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// Matches blink: "exile target creature, then return" or "exile target creature. return"
const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?creatures?[^.]*?(?:,\s*then\s+return|\.\s*return)/;

// Matches broad permanent bounce ("return target permanent to its owner's hand",
// "return target nonland permanent to its owner's hand") but NOT noncreature.
// The `(?!\s+card)` and `(?![^.]*?\bfrom\s+...graveyard)` guards reject
// "return target permanent card from your graveyard to your hand" (graveyard
// recursion, e.g. Coati Scavenger), which is covered by
// `effect.return_from_graveyard_to_hand`.
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached.
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+[,\s]+){0,5}noncreature\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// v0.14.6 — delayed-trigger blink-back template (Anzrag's Rampage). Spells
// that cheat a creature onto the battlefield and create a delayed end-step
// trigger to return it to hand. Anchor on "return it to <owner>'s hand at
// the beginning of <X> end step" — the delayed-trigger phrasing is distinct
// enough to be safe (regular ETB+bounce uses "return that creature").
const PATTERN_DELAYED_BLINKBACK =
  /\breturn (?:it|them)\s+to (?:your|its owner's|their owners')\s+hands?\s+at the beginning of (?:the next|the next player's|your|each)?\s*end step\b/;

// v0.19 — pronoun-anchored flicker (Gossip's Talent level 3): "whenever a
// creature ... deals combat damage ..., you may exile it, then return it to
// the battlefield". The "it" antecedent is the creature in the trigger
// clause. Gated on "creature" appearing earlier in the same sentence so
// artifact/enchantment flickers (which have their own axes) don't leak.
const PATTERN_BLINK_PRONOUN =
  /\bcreature[^.]{1,160}?\bexile (?:it|them)[,.]\s*(?:then\s+)?return\s+(?:it|them)\s+to the battlefield\b/;

// v0.20 — "those creatures" anaphoric bounce (Run Away Together: "Choose two
// target creatures controlled by different players. Return those creatures
// to their owners' hands."). The antecedent is established in a preceding
// "target ... creatures" sentence; the period boundary keeps this from
// firing on unrelated creature mentions earlier in the card.
const PATTERN_RETURN_THOSE =
  /\btarget [^.]{0,80}? creatures\b[^.]*\.\s*return those creatures [^.]*?\bto (?:their owners'?|its owner's) hands?/;

// v0.21.0 — Niko, Light of Hope: exile + delayed end-step return-to-
// battlefield with intervening sentences. Parallel to PATTERN_BLINK_OWN but
// admits sentence boundaries between exile and return, and allows the "to
// the battlefield" destination (PATTERN_BLINK_OWN uses verb-adjacent
// "return"). Anchored on the "beginning of the next end step" delayed
// trigger to keep this tight. Allows multiple intervening sentences via
// the `(?:\.[^.]{0,200}?)*` repeated period-bridge group.
const PATTERN_EXILE_DELAYED_RETURN =
  /\bexile\s+target\s+(?:[\w\-]+\s+)?creatures?\s+you\s+control\b[^.]*\.[^.]{0,200}?(?:\.[^.]{0,200}?)*\breturn\s+(?:it|them|that creature)\s+to the battlefield(?:\s+under\s+(?:its|their)\s+owner'?s\s+control)?\s+at\s+the\s+beginning\s+of\s+the\s+next\s+end\s+step\b/;

export const rule: Rule = {
  id: 'effect.bounce_creature',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_RETURN_OWN) ??
      t.match(PATTERN_BLINK_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_DELAYED_BLINKBACK) ??
      t.match(PATTERN_BLINK_PRONOUN) ??
      t.match(PATTERN_RETURN_THOSE) ??
      t.match(PATTERN_EXILE_DELAYED_RETURN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['creature', 'permanent', 'hand'], window: 12 },
};
