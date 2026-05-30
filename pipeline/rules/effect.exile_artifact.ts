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

// Flicker frame: "exile … Return [it|them|that artifact|target artifact] to the
// battlefield". This is bounce/blink (covered by `effect.bounce_artifact`), not
// removal. Suppress the exile-as-removal interpretation when the local tail
// contains a "return … to the battlefield" clause.
const FLICKER_TAIL = /\breturn (?:it|them|that artifact|target artifact|those (?:artifacts|permanents)|each of those cards)\b[^.]*?\bto the battlefield\b/;

export const rule: Rule = {
  id: 'effect.exile_artifact',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD) ?? t.match(PATTERN_VEHICLE);
    if (!m || m.index === undefined) return false;
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
    if (FLICKER_TAIL.test(tail)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['exile'], proximity: ['artifact', 'permanent'], window: 8 },
};
