// pipeline/rules/trigger.token_created.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.token_created',
  axis: 'trigger',
  label: 'Triggers on token creation',
  description: 'Triggers when one or more tokens are created.',
  pairsWith: ['effect.create_token'],
};

export const rule: Rule = {
  id: 'trigger.token_created',
  axis: 'trigger',
  match: (t) => {
    // Two verb forms: "(is|are) created" — explicit token-creation phrasing —
    // and "enter(s)" — modern templating uses "token … enters" interchangeably
    // (Wildwood Mentor: "whenever a token you control enters").
    const m = t.match(
      /whenever (?:a |one or more )?tokens?(?:\s+\w+){0,3}\s+(?:(?:is|are) created|enters?)/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
