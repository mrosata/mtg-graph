// pipeline/rules/effect.exile_planeswalker.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_planeswalker',
  axis: 'effect',
  label: 'Exiles a planeswalker',
  description: 'Exiles a target planeswalker from the battlefield, including "creature or planeswalker" effects.',
  pairsWith: ['trigger.planeswalker_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?planeswalkers?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonplaneswalker\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

// Replacement: "if [a permanent | creature or planeswalker] ... would die,
// exile it instead" (Torch the Tower). Sister-arm to exile_creature's
// PATTERN_REPLACEMENT, anchored on a planeswalker-inclusive earlier reference
// ("creature or planeswalker" / "permanent") so creature-only damage spells
// don't get the planeswalker tag.
const PATTERN_REPLACEMENT =
  /(?:creature or planeswalker|permanents?)[^.]{0,120}?(?:would die|would be destroyed)[^.]*?,\s+exile (?:it|that\s+\w+|them) instead/;

// v0.35.0 — Batch 16: forced-edict-via-exile with planeswalker noun. End
// of the Hunt: "Target opponent exiles a creature or planeswalker they
// control". The planeswalker branch of the "creature or planeswalker"
// disjunction. Mirrors the parallel arm added to effect.exile_creature.
const PATTERN_FORCED_EDICT =
  /\btarget opponent exiles\s+(?:[\w\-]+\s+){0,4}?(?:creatures?\s+or\s+)?planeswalkers?\s+they control\b/;

// Fix D — blink-frame suppressor. "Exile … return [it|them|that card|…] to
// the battlefield" is flicker/blink, not permanent removal. Mirrors the
// post-check in exile_creature.ts.
const FLICKER_TAIL = /\breturn (?:it|them|that card|that planeswalker|target planeswalker|those (?:planeswalkers|permanents)|each of those cards)\b[^.]*?\bto the battlefield\b/;

export const rule: Rule = {
  id: 'effect.exile_planeswalker',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_REPLACEMENT) ??
      t.match(PATTERN_FORCED_EDICT);
    if (!m || m.index === undefined) return false;
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
    if (FLICKER_TAIL.test(tail)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['exile'], proximity: ['planeswalker', 'permanent'], window: 8 },
};
