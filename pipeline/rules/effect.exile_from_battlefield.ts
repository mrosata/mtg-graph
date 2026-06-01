// pipeline/rules/effect.exile_from_battlefield.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_from_battlefield',
  axis: 'effect',
  label: 'Exiles any permanent',
  description: 'Exiles a permanent without type restriction. Type-specific exile is tagged on the typed children (effect.exile_creature / _artifact / _enchantment / _planeswalker / _land).',
  pairsWith: ['trigger.permanent_leaves_battlefield'],
  children: [
    'effect.exile_creature',
    'effect.exile_artifact',
    'effect.exile_enchantment',
    'effect.exile_planeswalker',
    'effect.exile_land',
  ],
};

// v0.15 — `nonland` removed from the type-restricting exclusion list.
// `nonland permanent` is functionally universal (covers creature, artifact,
// enchantment, planeswalker) and the canonical Oblivion-Ring / Banishing
// Light parent frame. The remaining non* qualifiers (noncreature,
// nonartifact, etc.) are real single-type exclusions and stay excluded
// so the typed children fire alone.
const PATTERN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker)\s+)(?:[\w\-]+\s+){0,5}?permanents?(?! cards?)\b/;

export const rule: Rule = {
  id: 'effect.exile_from_battlefield',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile'], proximity: ['permanent'], window: 8 },
};
