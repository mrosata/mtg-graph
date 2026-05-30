// pipeline/rules/trigger.creature_dies.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.creature_dies',
  axis: 'trigger',
  label: 'Triggers on creature death',
  description: 'Has an ability that triggers when a creature dies.',
  pairsWith: ['effect.sacrifice_permanent', 'effect.deals_damage', 'effect.exile_from_battlefield'],
};

export const rule: Rule = {
  id: 'trigger.creature_dies',
  axis: 'trigger',
  match: (t) => {
    // Accepts board-wide ("Whenever a creature dies"), self-dies
    // ("When this creature dies" / "When __SELF__ dies"), and delayed
    // ("Whenever a nontoken creature you control dies THIS TURN, …")
    // forms. The `[\w\- ]{0,30}?` filler before "creature" admits adjectives
    // like "nontoken", "tapped", "attacking", "white", and qualifiers like
    // "you control"/"an opponent controls" appearing between "a/another/this"
    // and "creature". Capped at 30 chars to avoid spanning sentence boundaries.
    // v0.13.4: post-creature filler bumped from {0,4} to {0,10} and the token
    // character class expanded to allow +, /, - so phrases like "with a +1/+1
    // counter on it" can sit between "creature" and "dies" (Explorer's Cache).
    //
    // v0.14.1: noun bumped to `creatures?` plural and verb to `(?:dies|die)`
    // so "one or more creatures you control die" (The Skullspore Nexus,
    // mass-death triggers) matches.
    const m = t.match(
      /(?:when|whenever) (?:a |another |this |one or more )?(?:[\w\- ]{0,30}?\s+)?(?:creatures?|__self__)(?:\s+[\w'+\/\-]+){0,10}\s+(?:dies|die)\b/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
