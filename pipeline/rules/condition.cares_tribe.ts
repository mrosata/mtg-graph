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

// 2026-06-02 audit batch — strip sentence-leading ability-word headers
// (e.g. "Goblin Formula — ...", "Dinosaur Formula — ...", "Top of the
// Food Chain — ...", "Mind Swap — ..."). The header NAME often includes
// a tribe / subtype word that isn't a payoff reference — the actual
// payoff sits in the body after the em-dash. Strip 1-9 leading tokens
// followed by " — " at the sentence start. Window widened to 9 tokens
// to admit prefixes like "vigilance top of the food chain — " (Kraven,
// Proud Predator) where the intrinsic keyword "vigilance" sits before
// the ability-word header without an intervening period. Em-dashes in
// MTG normalized text only appear in ability-word headers, saga
// chapters ("I — ..."), and modal choice bullets — none of those carry
// tribe-payoff intent inside the header span. Family-wide: applied
// symmetrically in condition.cares_subtype.ts.
const ABILITY_WORD_HEADER = /(?:^|\.\s+)[\w'\-]+(?:\s+[\w'\-]+){0,8}\s+—\s+/g;

// v0.22.0 — Possessed Goat: "it becomes a black demon in addition to its other
// colors and types" is self-typing transformation, not a tribal payoff. The
// distinctive "in addition to (its other|all other) (colors|types|colors and
// types)" tail only appears in self-typing transformation clauses. Anchor the
// strip on that tail so it doesn't over-strip. This strip is tribe-aware
// (built per-tribe) so it requires the tribe word inside the "becomes ..."
// span. Coexists with BECOMES_CREATURE — the existing strip handles manland
// self-animation (with "creature"); this one handles tribe transformation
// without "creature".
// 2026-06-01 audit Group 5 — Skyknight Squire: "it ... is a knight in addition
// to its other types" uses the verb `is` instead of `becomes`. Admit `is`
// alongside `becomes?` in the verb slot; the trailing "in addition to its
// other types" anchor still constrains this to genuine self-typing.
// 2026-06-02 audit batch — admit contractions (`'s` for "it's a Skeleton",
// "he's a 4/4 ...") and gendered possessives (`his|her|their`) alongside
// `its` in the "in addition to ... other types" tail. Xu-Ifit's "it's a
// skeleton in addition to its other types" and Superior Spider-Man's
// "he's a 4/4 spider human hero in addition to his other types" both
// fail the existing pattern. The new alternation accepts both verb
// contractions and possessive variants.
function becomesTribePattern(tribe: string): RegExp {
  return new RegExp(
    `\\b(?:becomes?|is|'s)\\s+(?:a\\s+|an\\s+)?(?:[\\w\\-\\/]+\\s+){0,5}?${tribePattern(tribe)}\\b(?:\\s+[\\w\\-\\/]+){0,3}?(?:\\s+in addition to (?:its other|all other|his other|her other|their other)\\s+(?:colors|types|colors and types))`,
    'g',
  );
}

// v0.39.0 — 200-card audit Ship 10. Aura/Equipment type-grant frame:
// "(enchanted|equipped) creature [... 0-200 chars ...] is a <Tribe> [...]
// in addition to its other types" — Angelic Destiny, Astrologian's
// Planisphere, Avatar Destiny, and ~22 more Aura/Equipment cards. The
// becomesTribePattern strip would remove this clause and the rule would
// miss; firing a positive arm BEFORE the strip captures these as tribal
// payoffs. Skyknight Squire ("it has flying and is a knight in addition")
// and Possessed Goat ("it becomes a black demon") anchor on the
// SELF-subject pronoun "it" — the typeGrantRe explicitly requires
// "(enchanted|equipped) creature" so those still hit the strip and stay
// negative.
function typeGrantPattern(tribe: string): RegExp {
  return new RegExp(
    `\\b(?:enchanted|equipped)\\s+creature\\b[^.]{0,200}?\\bis\\s+an?\\s+(?:[\\w\\-/]+\\s+){0,4}?${tribePattern(tribe)}\\b[^.]{0,40}?\\s+in addition to`,
    'i',
  );
}

function makeRule(tribe: string): Rule {
  const re = new RegExp(`\\b${tribePattern(tribe)}\\b`);
  const becomesTribe = becomesTribePattern(tribe);
  const typeGrantRe = typeGrantPattern(tribe);
  return {
    id: `condition.cares_tribe.${tribe}`,
    axis: 'condition',
    match: (raw) => {
      // Fire BEFORE the strip — Aura/Equipment type-grants on
      // "(enchanted|equipped) creature" subject are tribal payoffs.
      const tgMatch = raw.match(typeGrantRe);
      if (tgMatch) return { evidence: tgMatch[0] };
      const t = raw
        .replace(ABILITY_WORD_HEADER, (match) => (match.startsWith('.') ? '. ' : ''))
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
