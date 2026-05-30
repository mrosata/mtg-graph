// pipeline/rules/condition.cares_evasion.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_evasion',
  axis: 'condition',
  label: 'Cares about evasion',
  description: 'References creatures with flying, menace, or intimidate as a payoff group.',
  pairsWith: ['effect.has_flying', 'effect.has_menace', 'effect.grants_evasion'],
};

// Payoff phrasings that scope to a group of evasion-keyworded creatures:
//   "creatures with flying"  / "creature with menace"
//   "creatures you control with flying"
//
// v0.14.29 — removed the "<kw> creatures you control" leading-kw arm. It
// false-positived on Massacre Girl ("Menace\nCreatures you control have
// wither.") because normalize replaces newlines with spaces (no way to
// detect the ability-line boundary post-normalization). A grep of the live
// artifact showed Pattern 2 hit exactly that one card — no real payoff
// templating uses the leading-kw form in current Standard. The remaining
// pattern (Pattern 1) covers all real payoff templating.
const PATTERNS = [
  /\bcreatures? (?:you control )?with (?:flying|menace|intimidate)\b/,
];

// Strip framings that look like "creatures with flying" but aren't payoff
// references:
//   1. Token-creation clauses ("create a 1/1 blue Faerie creature token with
//      flying and ..."): the keyword is granted to the produced token, plus
//      the token's blocking-restriction often re-mentions the keyword.
//   2. "is/becomes a [N/N] [color/type] creature with <kw>" grant clauses:
//      the keyword is granted to the form the card takes (reanimation/animate).
//   3. "can(?:'t| only) block" blocking-restriction clauses on produced tokens.
const TOKEN_CREATE_GRANT = /\bcreates?\s+(?:[^.]*?)\btokens?\s+with\s+[^.]*?(?=\.|$)/g;
// "it's a 1/1 Spirit creature with flying" (Abuelo's Awakening), "becomes a
// 3/3 Dragon creature with flying", "is a Dragon with flying" — all grant
// frames where the keyword applies to the form the card takes. We match on
// the linking verb ("is" / "becomes" / "are" / "'s") followed optionally by
// a determiner/stat-line, then a "creature with <kw>" or "<type> with <kw>"
// payload. The leading `(?:'s|\b(?:becomes?|is|are))` handles the `it's`
// contraction (apostrophe-s) that the `\b` boundary wouldn't pick up on its
// own.
const BECOMES_CREATURE_GRANT = /(?:'s|\b(?:becomes?|is|are))\s+(?:[\w\-\/\s]+?\s+)?(?:creatures?|[A-Za-z]+)\s+with\s+[^.]*?(?=\.|$)/g;
// MTG block-restriction templating comes in three forms:
//   "can't block"           (Krenko goblin lord style)
//   "can only block"        (older templating)
//   "can block only ..."    (modern templating — Into the Fae Court's Faerie token)
const BLOCK_RESTRICTION = /\bcan(?:'t|(?: only)?) block(?: only)?[^.]*/g;

function stripGrantFraming(t: string): string {
  return t.replace(TOKEN_CREATE_GRANT, '').replace(BECOMES_CREATURE_GRANT, '').replace(BLOCK_RESTRICTION, '');
}

export const rule: Rule = {
  id: 'condition.cares_evasion',
  axis: 'condition',
  match: (t) => {
    const stripped = stripGrantFraming(t);
    for (const re of PATTERNS) {
      const m = stripped.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['with'], proximity: ['flying', 'menace', 'deathtouch'], window: 3 },
};
