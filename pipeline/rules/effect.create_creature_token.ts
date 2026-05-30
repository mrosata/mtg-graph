// pipeline/rules/effect.create_creature_token.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_TRIBES } from '../themes';

export const tagDef: TagDef = {
  tagId: 'effect.create_creature_token',
  axis: 'effect',
  label: 'Creates a creature token',
  description:
    "Creates a creature token specifically. Tighter than effect.create_token — excludes Treasures, Roles, Foods, etc. Carries metadata.creatureTypes when token's creature types are recognized.",
  pairsWith: ['trigger.another_creature_etb', 'trigger.token_created'],
};

// Narrower than effect.create_token — only matches when the produced token is a
// creature. "Create a Monster Role token" / "Create a Treasure token" don't match,
// so they don't get incorrectly paired with trigger.another_creature_etb.
//
// v0.14.9 — negative lookbehind for "(target|each|an?) opponent('?s)? "
// before "creates" — same controller-leak fix as effect.create_token
// (Hunted Bonebrute).
const OC = '(?<!\\b(?:target|each|an?)\\s+opponents?\\s+)';
const PATTERNS = [
  // Explicit "creature token" templating (the standard wording for creature tokens).
  new RegExp(`${OC}creates? [^.]{0,80}?creature tokens?`),
  // P/T stats inside a token clause imply a creature even when the word is omitted
  // (e.g. "create a 1/1 token copy of it" from the Offspring keyword).
  new RegExp(`${OC}creates? [^.]{0,60}?\\b\\d+\\/\\d+\\b[^.]{0,40}?tokens?`),
  // v0.12.9: copy-token frame where the copy source is implicitly a creature
  // (Gruff Triplets — "create two tokens that are copies of it" where "it"
  // is a creature; The Apprentice's Folly — "create a token that's a copy of
  // it" where "it" is a "target nontoken creature you control"). The "of it",
  // "of __self__", "of this creature", "of target creature" sources guarantee
  // the resulting token is a creature.
  new RegExp(`${OC}\\bcreates?\\s+[^.]{0,80}?tokens?\\s+that(?:\\s+(?:is|are)|['’]s)\\s+(?:a\\s+)?cop(?:y|ies)\\s+of\\s+(?:it|them|__self__|this creature|target creature|that creature|those creatures)`),
];

function extractCreatureTypes(evidence: string): string[] {
  const found: string[] = [];
  for (const tribe of THEME_TRIBES) {
    if (new RegExp(`\\b${tribe}s?\\b`, 'i').test(evidence)) {
      found.push(tribe);
    }
  }
  return found;
}

export const rule: Rule = {
  id: 'effect.create_creature_token',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) {
        const types = extractCreatureTypes(m[0]);
        return { evidence: m[0], ...(types.length ? { metadata: { creatureTypes: types } } : {}) };
      }
    }
    return false;
  },
  nearMiss: { anchors: ['create'], proximity: ['token', 'creature'], window: 8 },
};
