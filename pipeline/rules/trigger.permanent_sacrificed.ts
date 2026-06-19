// pipeline/rules/trigger.permanent_sacrificed.ts
//
// Aristocrats axis — "Whenever you sacrifice a {permanent}". Triggers on
// the controller's sacrifice action, distinct from `trigger.creature_dies`
// (which fires on death from any source, including combat) and from
// `effect.sacrifice_*` (which IS the sacrifice action, not a response to
// it). Korvold, Cathar Commando, Experimental Confectioner, Mayhem Devil.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.permanent_sacrificed',
  axis: 'trigger',
  label: 'Triggers when a player sacrifices a permanent',
  description: 'Has an ability that triggers when any player (you, an opponent, or each player) sacrifices a creature, artifact, enchantment, land, token, or permanent (the aristocrats axis).',
  pairsWith: [
    'effect.sacrifice_creature',
    'effect.sacrifice_artifact',
    'effect.sacrifice_enchantment',
    'effect.sacrifice_land',
    'effect.sacrifice_permanent',
    'effect.create_food',
    'effect.create_treasure',
    'effect.create_clue',
  ],
};

// "(when|whenever) you sacrifice (a |an |another )?{noun}" — noun is any
// permanent type or token subtype. Both "whenever" (recurring trigger) and
// "when" (single-fire trigger, e.g. Curious Cadaver) are admitted. The
// "you sacrifice" anchor is precise: it distinguishes the controller's
// sacrifice (this axis) from "whenever {permanent} is sacrificed" (passive)
// or "sacrifice X: do Y" (cost).
const PATTERN = /\b(?:when|whenever) you sacrifice (?:a |an |another |one or more |two or more |three or more |\d+ |x )?(?:permanents?|creatures?|artifacts?|enchantments?|lands?|tokens?|foods?|treasures?|clues?|bloods?|maps?|powerstones?|incubators?|roles?)\b/;

// v0.39.0 — 200-card audit Ship 12c — Ashling, the Limitless. "Whenever
// you sacrifice a nontoken elemental" — typed-sac with the "nontoken"
// prefix and a CreatureType noun. Cautious broadening: only admit
// "nontoken <CreatureType>" patterns to avoid arbitrary noun absorption.
// The noun slot here is permissive (any \w+) BUT the "nontoken" qualifier
// constrains the templating to genuine typed-sac aristocrats.
const PATTERN_NONTOKEN_TYPED =
  /\b(?:when|whenever) you sacrifice (?:a |an |another )?nontoken\s+[\w-]+\b/;

// Fix K — Mayhem Devil: "whenever a player sacrifices a permanent". Broadens
// from controller-only to any-player scope (a player / an opponent / each
// player). Distinct from the cost patterns ("sacrifice X: do Y") by the
// when|whenever trigger anchor.
const PATTERN_ANY_PLAYER =
  /\b(?:when|whenever)\s+(?:a player|an opponent|each player)\s+sacrifices\s+(?:a |an |another )?(?:permanent|creature|artifact|enchantment|land|planeswalker)s?\b/;

// Fix K — passive "is sacrificed" form: "whenever a permanent is sacrificed".
const PATTERN_PASSIVE =
  /\bwhenever\s+(?:a permanent|a creature|an artifact|an enchantment|a land|a planeswalker)\s+is sacrificed\b/;

export const rule: Rule = {
  id: 'trigger.permanent_sacrificed',
  axis: 'trigger',
  match: (t) => {
    const m =
      t.match(PATTERN) ??
      t.match(PATTERN_NONTOKEN_TYPED) ??
      t.match(PATTERN_ANY_PLAYER) ??
      t.match(PATTERN_PASSIVE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['whenever', 'you'], window: 6 },
};
