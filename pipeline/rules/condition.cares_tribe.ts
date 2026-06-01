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

// v0.22.0 — Possessed Goat: "it becomes a black demon in addition to its other
// colors and types" is self-typing transformation, not a tribal payoff. The
// distinctive "in addition to (its other|all other) (colors|types|colors and
// types)" tail only appears in self-typing transformation clauses. Anchor the
// strip on that tail so it doesn't over-strip. This strip is tribe-aware
// (built per-tribe) so it requires the tribe word inside the "becomes ..."
// span. Coexists with BECOMES_CREATURE — the existing strip handles manland
// self-animation (with "creature"); this one handles tribe transformation
// without "creature".
function becomesTribePattern(tribe: string): RegExp {
  return new RegExp(
    `\\bbecomes?\\s+(?:a\\s+|an\\s+)?(?:[\\w\\-]+\\s+){0,5}?${tribePattern(tribe)}\\b(?:\\s+in addition to (?:its other|all other)\\s+(?:colors|types|colors and types))`,
    'g',
  );
}

function makeRule(tribe: string): Rule {
  const re = new RegExp(`\\b${tribePattern(tribe)}\\b`);
  const becomesTribe = becomesTribePattern(tribe);
  return {
    id: `condition.cares_tribe.${tribe}`,
    axis: 'condition',
    match: (raw) => {
      const t = raw
        .replace(TOKEN_CREATE, '')
        .replace(BECOMES_CREATURE, '')
        .replace(becomesTribe, '');
      const m = t.match(re);
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
