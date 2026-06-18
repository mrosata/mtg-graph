// pipeline/rules/effect.exile_artifact.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_artifact',
  axis: 'effect',
  label: 'Exiles an artifact',
  description: 'Exiles a target artifact from the battlefield, including multi-type "artifact or enchantment" effects.',
  pairsWith: ['trigger.artifact_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?artifacts?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonartifact\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

// v0.14.1 — Vehicle synonym. Vehicle is always an artifact (CR 205.3g), so
// "exile target vehicle" / "exile target creature, vehicle, or nonbasic land"
// should fire effect.exile_artifact. Ray of Ruin.
const PATTERN_VEHICLE =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?vehicles?(?! cards?)\b/;

// v0.27.x — Artifact subtypes (CR 301.5b). Equipment / Food / Treasure /
// Clue / Map / Powerstone are unambiguously artifacts, so "exile target
// equipment", "exile target treasure", etc. should fire effect.exile_artifact.
// Fiery Annihilation: "Exile up to one target Equipment attached to that creature."
const PATTERN_ARTIFACT_SUBTYPE =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?(?:equipments?|foods?|treasures?|clues?|maps?|powerstones?)(?! cards?)\b/;

// Flicker frame: "exile … Return [it|them|that artifact|target artifact] to the
// battlefield". This is bounce/blink (covered by `effect.bounce_artifact`), not
// removal. Suppress the exile-as-removal interpretation when the local tail
// contains a "return … to the battlefield" clause.
const FLICKER_TAIL = /\breturn (?:it|them|that artifact|target artifact|those (?:artifacts|permanents)|each of those cards)\b[^.]*?\bto the battlefield\b/;

// v0.43.0 — Thor FP: "exile target equipment, instant, or sorcery card FROM
// YOUR GRAVEYARD" is graveyard-removal, not battlefield-removal of an artifact.
// Suppress when the 80-char tail after the match contains "from <X> graveyard".
const GRAVEYARD_TAIL = /\bfrom (?:a|your|their|an opponent'?s|any) graveyards?\b/;

// Split-mode punisher: "exile X. if you controlled it, return it to the
// battlefield ..." gates the return on ownership. For opponent-controlled
// targets the card is removal-with-replacement, not flicker — Unyielding
// Gatekeeper is the canonical case. When the return is conditioned on this
// preamble we must NOT suppress the exile tag.
const CONDITIONAL_RETURN_PREAMBLE =
  /\bif you controlled (?:it|them|that (?:creature|artifact|permanent|nonland permanent))\b/;

export const rule: Rule = {
  id: 'effect.exile_artifact',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_VEHICLE) ??
      t.match(PATTERN_ARTIFACT_SUBTYPE);
    if (!m || m.index === undefined) return false;
    // v0.43.0 — graveyard-source guard: "exile target equipment/artifact ... from
    // your graveyard" is graveyard-removal, not battlefield artifact removal.
    const graveyardWindow = t.slice(m.index + m[0].length, m.index + m[0].length + 80);
    if (GRAVEYARD_TAIL.test(graveyardWindow)) return false;
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
    const flicker = FLICKER_TAIL.exec(tail);
    if (flicker && flicker.index !== undefined) {
      const beforeReturn = tail.slice(0, flicker.index);
      if (!CONDITIONAL_RETURN_PREAMBLE.test(beforeReturn)) return false;
    }
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['exile'], proximity: ['artifact', 'permanent'], window: 8 },
};
