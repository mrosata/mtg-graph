// pipeline/rules/effect.bounce_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.bounce_creature',
  axis: 'effect',
  label: 'Bounces a creature to hand',
  description: 'Returns a creature (or broad permanent) to its owner\'s hand. Exile + return-to-battlefield is owned by `effect.blink` (immediate) or `effect.flicker` (delayed); this tag is bounce-to-hand only.',
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
// FIX 6 (BR-1) — Aetherize: singular "their owner's hand" destination on a
// sweep. Original tail only admitted `their owners'` plural; admit the
// singular template `their owner's` too. The plural form still wins on
// multi-target frames.
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+(?:other\s+)?)?(?:this\s+|another\s+|target\s+|those\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?creatures?\b(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)\s[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?|their\s+owner'?s)\s+hands?\b/;

// Matches broad permanent bounce ("return target permanent to its owner's hand",
// "return target nonland permanent to its owner's hand") but NOT noncreature.
// The `(?!\s+card)` and `(?![^.]*?\bfrom\s+...graveyard)` guards reject
// "return target permanent card from your graveyard to your hand" (graveyard
// recursion, e.g. Coati Scavenger), which is covered by
// `effect.return_from_graveyard_to_hand`.
// v0.20 — admit commas in the qualifier filler so "nonland, nontoken
// permanent" (Season of Weaving) is reached.
// 2026-06-01 audit batch — Marang River Regent / Sunpearl Kirin / Jill /
// Eject: admit "(up to )?<count> (other )?" count slot before the
// determiner, so "return up to two other target nonland permanents to their
// owners' hands" reaches the permanents? noun.
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|\w+|one or two|up to two)\s+(?:other\s+)?)?(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+[,\s]+){0,5}noncreature\s+)(?:[\w\-]+[,\s]+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owner'?s|their\s+owners'?)\s+hands?\b/;

// v0.14.6 — delayed-trigger blink-back template (Anzrag's Rampage). Spells
// that cheat a creature onto the battlefield and create a delayed end-step
// trigger to return it to HAND. Anchor on "return it to <owner>'s hand at
// the beginning of <X> end step" — the delayed-trigger phrasing is distinct
// enough to be safe (regular ETB+bounce uses "return that creature").
// NOTE: destination is HAND. The mirror "return ... to the battlefield at
// the beginning of the next end step" is FLICKER, handled by effect.flicker.
const PATTERN_DELAYED_BLINKBACK =
  /\breturn (?:it|them)\s+to (?:your|its owner's|their owners')\s+hands?\s+at the beginning of (?:the next|the next player's|your|each)?\s*end step\b/;

// v0.20 — "those creatures" anaphoric bounce (Run Away Together: "Choose two
// target creatures controlled by different players. Return those creatures
// to their owners' hands."). The antecedent is established in a preceding
// "target ... creatures" sentence; the period boundary keeps this from
// firing on unrelated creature mentions earlier in the card.
const PATTERN_RETURN_THOSE =
  /\btarget [^.]{0,80}? creatures\b[^.]*\.\s*return those creatures [^.]*?\bto (?:their owners'?|its owner's) hands?/;

// FIX 6 (BR-1) — Arcanis the Omnipotent: self-name bounce ("return __self__
// to its owner's hand"). Self-bounce re-triggers ETB and is mechanically a
// creature bounce on the same axis as `return this creature to its owner's
// hand`. The existing PATTERN_RETURN_OWN requires a `creature` noun anchor,
// so __self__ on its own (no "creature" word) didn't reach the tail.
const PATTERN_RETURN_SELF =
  /\breturn(?:s)?\s+__self__\s+to\s+(?:its\s+owner'?s|your)\s+hand\b/;

// 2026-06-01 audit batch — Cactuar: self-anaphoric "return it to its
// owner's hand" where the antecedent is "this creature" earlier in the
// clause. Bounded backward window requires "this creature" to be visible
// within ~120 chars so a bare "return it" without a self antecedent
// doesn't fire (those are handled by PATTERN_DELAYED_BLINKBACK or by the
// flicker/blink rules with their own anchors).
const PATTERN_SELF_ANAPHORIC_IT =
  /\bthis\s+creature\b[^.]{0,120}?\breturn(?:s)?\s+it\s+to\s+(?:its\s+owner'?s|your)\s+hand\b/;

// 2026-06-01 audit Wave 2 — the prior PATTERN_BLINK_OWN, PATTERN_BLINK_PRONOUN,
// and PATTERN_EXILE_DELAYED_RETURN arms moved out of this rule. They matched
// "exile <creature> ... return ... to the battlefield" frames which are
// blink (immediate) or flicker (delayed end-step), NOT bounce-to-hand.
// Those cases are now owned by `effect.blink` and `effect.flicker`. This
// rule's surviving arms ALL anchor the destination as "hand".
export const rule: Rule = {
  id: 'effect.bounce_creature',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_RETURN_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_DELAYED_BLINKBACK) ??
      t.match(PATTERN_RETURN_THOSE) ??
      t.match(PATTERN_RETURN_SELF) ??
      t.match(PATTERN_SELF_ANAPHORIC_IT);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return'], proximity: ['creature', 'permanent', 'hand'], window: 12 },
};
