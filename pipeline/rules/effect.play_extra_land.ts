// pipeline/rules/effect.play_extra_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.play_extra_land',
  axis: 'effect',
  label: 'Lets you play extra lands',
  description: 'Lets a player play an additional land (or more) on their turn. Exploration / Azusa / Plant Beans family.',
  pairsWith: ['condition.cares_lands'],
};

// "you may play an additional land" / "play an additional land each turn" /
// "play two additional lands this turn" — the extra-land-drop family.
const PATTERN =
  /\bplay (?:an? |one |two |three |\d+ )?additional lands?\b/;

// v0.35.0 — Batch 14: hand → play extra-land lane. Lessons from Life and
// Embrace the Paradox ("You may put a land card from your hand onto the
// battlefield tapped"), Michelangelo, Improviser ("put ... and/or a land
// card from your hand onto the battlefield"). This is the canonical
// Exploration/Arboreal Grazer template — an extra land drop from hand,
// distinct from `effect.ramp_nonland` (library→play). Anchored on the
// full phrase to avoid FPs on basic-land plays.
const PATTERN_HAND_PUT =
  /\b(?:you may )?put (?:a |an )?land card from your hand onto the battlefield\b/;

export const rule: Rule = {
  id: 'effect.play_extra_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_HAND_PUT);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['additional'], proximity: ['land', 'play'], window: 4 },
};
