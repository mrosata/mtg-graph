// pipeline/rules/effect.destroy_permanent.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_permanent',
  axis: 'effect',
  label: 'Destroys any permanent',
  description: 'Destroys a permanent without type restriction (e.g., "destroy target permanent", Vindicate-style). Type-specific destruction is tagged on the typed children (effect.destroy_creature / _artifact / _enchantment / _planeswalker / _land), which the tag-expansion post-pass applies alongside this parent.',
  pairsWith: ['trigger.permanent_leaves_battlefield'],
  children: [
    'effect.destroy_creature',
    'effect.destroy_artifact',
    'effect.destroy_enchantment',
    'effect.destroy_planeswalker',
    'effect.destroy_land',
  ],
};

// Match "destroy ... permanent|token" only when no type-restricting `non<type>`
// modifier appears in the preceding ~5 tokens.
//
// v0.14.9 — `token(s)` added as a noun alongside `permanent(s)`. Tokens
// cover all permanent types, so "destroy target token" is semantically
// wildcard removal (Kraul Whipcracker: "destroy target token an opponent
// controls").
const PATTERN =
  /\bdestroy(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland)\s+)(?:[\w\-]+\s+){0,5}?(?:permanents?|tokens?)\b/;

export const rule: Rule = {
  id: 'effect.destroy_permanent',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['destroy'],
    proximity: ['permanent'],
    window: 8,
  },
};
