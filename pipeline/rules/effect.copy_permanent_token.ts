// pipeline/rules/effect.copy_permanent_token.ts
//
// Half of the v0.14.0 split of the legacy `effect.copy_permanent`. This tag
// fires when the card CREATES A TOKEN that is a copy of a permanent — the
// new entity ETBs as the token (Cackling Counterpart, Mirror March, etc.).
// In-place clone shapes ("__self__ becomes a copy of") moved to the sister
// `effect.clone_in_place` rule; only this half retains the token_created
// pairing.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.copy_permanent_token',
  axis: 'effect',
  label: 'Creates a token copy of a permanent',
  description: 'Creates a token that is a copy of a creature or other permanent. The new token ETBs and counts as a token-created event.',
  pairsWith: ['trigger.another_creature_etb', 'trigger.token_created'],
};

// "create [N] [adjectives] token(s) that('s|are) [...] cop(y|ies) of".
// The `[\w-]+ ` slot before "tokens" admits modifiers like "tapped and attacking".
const CREATE_COPY_TOKEN = /\bcreate(?:s)? (?:a|an|\d+|x|one|two|three|four|five|six|seven|eight|nine|ten|that many)(?: [\w\-]+){0,4} tokens? that(?:'s| are| is)(?: [\w\-]+){0,3} cop(?:y|ies) of\b/;

export const rule: Rule = {
  id: 'effect.copy_permanent_token',
  axis: 'effect',
  match: (t) => {
    const m = t.match(CREATE_COPY_TOKEN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['token', 'copy', 'copies'], proximity: ['create', 'that'], window: 6 },
};
