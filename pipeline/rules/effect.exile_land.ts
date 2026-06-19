// pipeline/rules/effect.exile_land.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_land',
  axis: 'effect',
  label: 'Exiles a land',
  description: 'Exiles a target land from the battlefield.',
  pairsWith: ['trigger.land_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:[\w\-]+[,\s]+){0,6}?lands?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonland\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

// Fix D — blink-frame suppressor. "Exile … return [it|them|that card|…] to
// the battlefield" is flicker/blink, not permanent removal. Mirrors the
// post-check in exile_creature.ts.
const FLICKER_TAIL = /\breturn (?:it|them|that card|that land|target land|those (?:lands|permanents)|each of those cards)\b[^.]*?\bto the battlefield\b/;

export const rule: Rule = {
  id: 'effect.exile_land',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD);
    if (!m || m.index === undefined) return false;
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
    if (FLICKER_TAIL.test(tail)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['exile'], proximity: ['land', 'permanent'], window: 8 },
};
