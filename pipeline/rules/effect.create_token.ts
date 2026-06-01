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
  // v0.19 — filler character class now admits `,` so the named-token frame
  // ("create Cragflame, a legendary colorless Equipment artifact token":
  // Mabel, Heir to Cragflame) reaches the trailing "token" anchor. The
  // non-greedy filler still requires "token" to terminate the match, so
  // unrelated comma-separated clauses won't extend the match arbitrarily.
  new RegExp(`${OPPONENT_CREATES}creates? (?:a |an |the |\\d+ )?(?:[a-z0-9\\/+\\-, ]+? )?token`),
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
