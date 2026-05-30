// pipeline/rules/effect.create_role.ts
//
// Creates a Role token — typed parallel to create_food / create_treasure /
// create_clue. Roles are an Eldraine-block Aura subtype attached to a target
// creature, with each named Role granting a different static (e.g. Young
// Hero +1/+1 attack-counter trigger, Monster +1/+1 + trample, Wicked
// graveyard-drain). Catalog already has `condition.cares_subtype.role` and
// `condition.cares_subtype.aura` consumers; this is the symmetric effect tag.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.create_role',
  axis: 'effect',
  label: 'Creates Role tokens',
  description: 'Creates one or more Role tokens (Aura subtype attached to a target creature).',
  pairsWith: ['condition.cares_subtype.role', 'condition.cares_subtype.aura', 'trigger.token_created'],
};

// Roles have variable adjectives between "create" and "role token" — Young
// Hero, Monster, Wicked, Cursed, Sorcerer, Virtuous, etc. Filler [^.]{0,80}?
// non-greedily spans the adjective(s).
const PATTERNS = [
  /\bcreates?\s+(?:a|an|\d+|x|one|two|three|four|five)\s+[^.]{0,40}?role\s+tokens?\b/,
  /\bcreates?\s+[^.]{0,80}?\brole\s+tokens?\b/,
];

export const rule: Rule = {
  id: 'effect.create_role',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['role'], proximity: ['create', 'token'], window: 6 },
};
