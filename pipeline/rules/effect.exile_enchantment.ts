// pipeline/rules/effect.exile_enchantment.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_enchantment',
  axis: 'effect',
  label: 'Exiles an enchantment',
  description: 'Exiles a target enchantment from the battlefield, including multi-type "artifact or enchantment" effects.',
  pairsWith: ['trigger.enchantment_leaves_battlefield'],
};

// Tempered greedy filler `(?!\buntil\b)` blocks "exile target X ... until this
// enchantment leaves the battlefield" (Banishing-Light pattern: Food Coma,
// Cast Out, Realmbreaker's Grasp). The "enchantment" there is a duration
// anchor referring to {self}, not the target of exile.
const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?:(?!\buntil\b)[\w\-/]+[,\s]+){0,6}?enchantments?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}nonenchantment\s+)(?:(?!\buntil\b)[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

// v0.19 — opponent-edict-exile (Early Winter): "target opponent exiles an
// enchantment they control". The opponent picks which of their enchantments
// to exile; semantically the same removal class as direct exile (the
// enchantment leaves the battlefield via exile). Determiner slot admits
// "a / an / one / two / N" and tolerates a short adjective/noun bridge
// before "enchantments?" (e.g. modal "creature, an artifact, or an
// enchantment").
const PATTERN_EDICT =
  /\btarget (?:opponent|player) exiles? (?:a |an |one |two |three |\d+ )(?:[\w\-]+[,\s]+){0,6}?enchantments?\b/;

// Fix D — blink-frame suppressor. "Exile … return [it|them|that card|…] to
// the battlefield" is flicker/blink (covered by effect.blink / effect.flicker),
// not permanent removal. Mirrors the post-check in exile_creature.ts.
const FLICKER_TAIL = /\breturn (?:it|them|that card|that enchantment|target enchantment|those (?:enchantments|permanents)|each of those cards)\b[^.]*?\bto the battlefield\b/;

export const rule: Rule = {
  id: 'effect.exile_enchantment',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN_OWN) ?? t.match(PATTERN_BROAD) ?? t.match(PATTERN_EDICT);
    if (!m || m.index === undefined) return false;
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
    if (FLICKER_TAIL.test(tail)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['exile'], proximity: ['enchantment', 'permanent'], window: 8 },
};
