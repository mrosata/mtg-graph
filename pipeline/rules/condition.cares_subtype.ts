// pipeline/rules/condition.cares_subtype.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_SUBTYPES, subtypePattern, capitalize, pluralize } from '../themes';

export const tagDefs: TagDef[] = THEME_SUBTYPES.map((subtype) => ({
  tagId: `condition.cares_subtype.${subtype}`,
  axis: 'condition',
  label: `Cares about ${capitalize(pluralize(subtype))}`,
  description: `References the ${capitalize(subtype)} subtype.`,
  pairsWith: [`effect.tutors_subtype.${subtype}`],
  category: 'theme',
}));

// Matches any mention of the subtype word in normalized oracle text. The rule is
// intentionally broad — even a single reference is enough signal that the card cares
// about the theme. Card names referencing the subtype don't pollute matches because
// __self__ replacement runs before this rule sees the text.
//
// We strip three framings before matching to avoid false-positive tribal/subtype edges:
//   1. "this <subtype>" self-references (a Saga referring to itself doesn't care about Sagas)
//   2. "create [...] <subtype> [...] token" — token-creation framing
//   3. "becomes [...] creature" — animate-land / type-change framing
const TOKEN_CREATE = /\bcreates?\s+(?:[\w\/]+\s+){1,7}?tokens?\b/g;
const BECOMES_CREATURE = /\bbecomes?\s+(?:[\w\/]+\s+){1,7}?creature\b/g;

// Subtype-specific alt patterns — additional phrasings that should count as
// caring about the subtype. Aura: "enchanted creatures" (plural) is the
// canonical Aura-tribal anthem phrasing on non-Aura cards like Syr Armont.
// Singular "enchanted creature" is excluded because it's an Aura's own
// self-reference to the creature it's attached to.
const SUBTYPE_ALT_PATTERNS: Record<string, RegExp | undefined> = {
  aura: /\benchanted (?:creatures|permanents)\b/,
};

// v0.20.0 — strip Gift-keyword token-naming. "Gift a <subtype>" is the
// keyword's token-name line (Valley Rally: "gift a food creatures you
// control get +2/+0..."), not a payoff that cares about the subtype.
// Family-wide strip (the leak is symmetric across all subtypes).
const GIFT_TOKEN_NAME = /\bgift a [a-z\-]+\b/g;

function stripFraming(t: string, subtype: string): string {
  const selfRef = new RegExp(`\\bthis ${subtypePattern(subtype)}\\b`, 'g');
  return t
    .replace(selfRef, '')
    .replace(TOKEN_CREATE, '')
    .replace(BECOMES_CREATURE, '')
    .replace(GIFT_TOKEN_NAME, '');
}

function makeRule(subtype: string): Rule {
  // Negative-lookbehind `(?<!non-)` excludes "non-Aura" / "non-Saga"
  // restriction frames (Abuelo's Awakening: "non-Aura enchantment card").
  // The "non-X" form is well-known noise for cares_subtype rules — the card
  // explicitly RESTRICTS AWAY from the subtype, so it never "cares about" it.
  const re = new RegExp(`(?<!non-)\\b${subtypePattern(subtype)}\\b`);
  const altRe = SUBTYPE_ALT_PATTERNS[subtype];
  return {
    id: `condition.cares_subtype.${subtype}`,
    axis: 'condition',
    match: (t) => {
      const stripped = stripFraming(t, subtype);
      const m = stripped.match(re) ?? (altRe ? stripped.match(altRe) : null);
      return m ? { evidence: m[0] } : false;
    },
  };
}

export const rules: Rule[] = THEME_SUBTYPES.map(makeRule);
