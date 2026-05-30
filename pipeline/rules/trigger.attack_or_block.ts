// pipeline/rules/trigger.attack_or_block.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.attack_or_block',
  axis: 'trigger',
  label: 'Triggers on attack or block',
  description: 'Triggers when a creature attacks or blocks.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'trigger.attack_or_block',
  axis: 'trigger',
  match: (t) => {
    // Negative lookbehind blocks "can't|cannot|won't|doesn't|may not|will not|
    // do not|would not " preceding the verb — that's a static restriction
    // inside quoted token text (Experimental Confectioner) or a self-modifier,
    // not a trigger. Trailing \b on the verbs requires a word boundary so we
    // don't match the participle inside "the attacking player" / "the blocking
    // creature" (Contested Game Ball).
    const m = t.match(
      /whenever (?:[^.]*?)(?<!(?:can't|cannot|won't|doesn't|may not|will not|do not|would not) )(?:attacks?\b|blocks?\b|becomes blocked\b)/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
