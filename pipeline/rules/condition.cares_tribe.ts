// pipeline/rules/condition.cares_tribe.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_TRIBES, tribePattern, capitalize, pluralize } from '../themes';

// Strip token-creation and animation framings before matching, so the tribe word
// appearing as the TYPE of a created/transformed token doesn't fire the rule. The
// rule should only fire on genuine tribal-payoff references (anthems, gates, etc.).
// Window bumped from {1,7} to {1,12} for long multi-type, multi-color token
// templates like "create a 4/3 white and black vampire demon creature token
// with flying" (Canonized in Blood — 9+ words between "create" and "token").
const TOKEN_CREATE = /\bcreates?\s+(?:[\w\/]+\s+){1,12}?tokens?\b/g;
const BECOMES_CREATURE = /\bbecomes?\s+(?:[\w\/]+\s+){1,12}?creature\b/g;

function stripFraming(t: string): string {
  return t.replace(TOKEN_CREATE, '').replace(BECOMES_CREATURE, '');
}

function makeRule(tribe: string): Rule {
  const re = new RegExp(`\\b${tribePattern(tribe)}\\b`);
  return {
    id: `condition.cares_tribe.${tribe}`,
    axis: 'condition',
    match: (t) => {
      const m = stripFraming(t).match(re);
      return m ? { evidence: m[0] } : false;
    },
    // nearMiss is degenerate for a single-keyword rule; coverage CLI skips it.
  };
}

export const rules: Rule[] = THEME_TRIBES.map(makeRule);

export const tagDefs: TagDef[] = THEME_TRIBES.map((tribe) => ({
  tagId: `condition.cares_tribe.${tribe}`,
  axis: 'condition',
  label: `Cares about ${capitalize(pluralize(tribe))}`,
  description: `References the ${capitalize(tribe)} creature type.`,
  pairsWith: ['effect.create_creature_token'],
  category: 'theme',
}));
