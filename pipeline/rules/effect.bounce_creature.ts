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
const PATTERN_RETURN_OWN =
  /\breturn(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+(?:other\s+)?)?(?:this\s+|another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,5}?creatures?\b(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)\s[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

// Matches blink: "exile target creature, then return" or "exile target creature. return"
const PATTERN_BLINK_OWN =
  /\bexile(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?:[\w\-]+[,\s]+){0,5}?creatures?[^.]*?(?:,\s*then\s+return|\.\s*return)/;

// Matches broad permanent bounce ("return target permanent to its owner's hand",
// "return target nonland permanent to its owner's hand") but NOT noncreature.
// The `(?!\s+card)` and `(?![^.]*?\bfrom\s+...graveyard)` guards reject
// "return target permanent card from your graveyard to your hand" (graveyard
// recursion, e.g. Coati Scavenger), which is covered by
// `effect.return_from_graveyard_to_hand`.
const PATTERN_BROAD =
  /\breturn(?:s)?\s+(?:another\s+|target\s+|each\s+|all\s+)?(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?permanents?(?!\s+card)(?![^.]*?\bfrom\s+(?:a|your|their|an\s+opponent'?s)\s+graveyards?)[^.]*?\bto\s+(?:its\s+owner'?s|your|their\s+owners'?)\s+hands?\b/;

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

export const rule: Rule = {
  id: 'effect.bounce_creature',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_RETURN_OWN) ??
      t.match(PATTERN_BLINK_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_DELAYED_BLINKBACK) ??
      t.match(PATTERN_BLINK_PRONOUN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['return', 'exile'], proximity: ['creature', 'permanent', 'hand'], window: 12 },
};
