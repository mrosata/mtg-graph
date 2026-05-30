// pipeline/rules/effect.explore.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.explore',
  axis: 'effect',
  label: 'Explore',
  description:
    'LCI/Ixalan keyword action: a creature reveals the top of its controller\'s library; if a land, into hand, otherwise +1/+1 counter and choose to keep on top or mill.',
  pairsWith: ['trigger.explored'],
};

// "<creature> explores" / "it explores" / "would explore" — keyword action.
// Reminder text (parenthesized) is stripped before normalization, so the only
// remaining occurrences of "explore[s]" are the action itself or trigger
// references. The trigger side has its own rule (trigger.explored) — both can
// fire on cards like Twists and Turns that contain both shapes.
//
// v0.14.1: strip "whenever <creature-subject> explores" trigger frames before
// matching so cards that ONLY observe explores (Merfolk Cave-Diver, Nicanzil)
// don't fire the effect-axis rule. Twists and Turns still fires via the
// imperative "that creature explores" outside the trigger frame.
// The trigger-frame strip is narrowly anchored: the "whenever" clause's
// SUBJECT must be a creature-noun group and its VERB must be "explores" (with
// optional object filler). This avoids over-stripping unrelated whenever
// clauses like "whenever you gain life, __SELF__ explores" (Amalia
// Benavides Aguirre) which is a real effect-axis explore.
const TRIGGER_FRAME =
  /\bwhenever\s+(?:a|an|another)\s+(?:[\w\-]+\s+){0,4}creatures?\s+(?:[\w\-']+\s+){0,3}?explores?[^.]*?(?:\.|$)/g;
const PATTERN = /\bexplores?\b/;

export const rule: Rule = {
  id: 'effect.explore',
  axis: 'effect',
  match: (t) => {
    const stripped = t.replace(TRIGGER_FRAME, '');
    const m = stripped.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['explore'], proximity: ['creature', 'it', 'target'], window: 4 },
};
