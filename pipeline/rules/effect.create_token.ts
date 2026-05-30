// pipeline/rules/effect.create_token.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.create_token',
  axis: 'effect',
  label: 'Creates tokens',
  description: 'Creates one or more tokens of any kind (creatures, Treasures, Roles, etc.).',
  pairsWith: ['trigger.token_created'],
};

// "investigate" is a keyword action that always creates a Clue token; reminder
// text is stripped pre-tag so the bare keyword must be caught here as well.
//
// v0.14.9 — negative lookbehind for "(target|each|an?) opponent('?s)? "
// before "creates" — opponent-side token-creation (Hunted Bonebrute: "target
// opponent creates two 1/1 white Dog creature tokens") shouldn't pair this
// card with "cares about tokens you control" payoffs since the controller
// never gains the tokens. Mirror of the typed-sacrifice NEGATIVE_EDICT.
const OPPONENT_CREATES = '(?<!\\b(?:target|each|an?)\\s+opponents?\\s+)';
const PATTERNS: RegExp[] = [
  new RegExp(`${OPPONENT_CREATES}creates? (?:a |an |\\d+ )?(?:[a-z0-9\\/+\\- ]+? )?token`),
  /\binvestigates?\b/,
];

export const rule: Rule = {
  id: 'effect.create_token',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
};
