// pipeline/rules/effect.has_toxic.ts
//
// Intrinsic-only — requires Scryfall's `keywords` array to include "Toxic"
// AND a standalone "toxic N" line where the keyword survives reminder-text
// stripping. The N is a non-negative integer (canonically 1, 2, or 3 in
// current Standard via Phyrexia: All Will Be One / FDN reprints — Bloodroot
// Apothecary carries Toxic 2 in the current Standard artifact).
//
// Toxic gives the bearer's combat damage to a player N extra poison
// counters. Pairs with `condition.cares_poison` payoffs. The "give poison
// counters" portion is captured separately by `effect.give_poison_counters`
// (Toxic's reminder text is stripped pre-rule, so the bare "toxic N"
// keyword is the load-bearing anchor for this tag).
//
// Mirrors `effect.has_ward` (parameterized "keyword N" form) — the keyword
// line carries an integer suffix that the standard `isIntrinsicKeyword`
// helper handles by stripping the mana/numeric token before checking.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_toxic',
  axis: 'effect',
  label: 'Has toxic',
  description:
    'Has the toxic keyword as a printed intrinsic ability (combat damage to a player gives that player N poison counters).',
  pairsWith: ['condition.cares_poison'],
};

// "toxic <digits>" on the normalized text as a fallback anchor, in case
// isIntrinsicKeyword's mana-token strip doesn't yield a clean "toxic"
// alone after removing the integer (the helper strips `{...}` mana tokens
// but `toxic 2` is a bare-digit suffix, not a mana token).
const TOXIC_N = /\btoxic\s+\d+\b/;

export const rule: Rule = {
  id: 'effect.has_toxic',
  axis: 'effect',
  matchCard: (card, normalized) => {
    if (!card.keywords.includes('Toxic')) return false;
    if (TOXIC_N.test(normalized)) return { evidence: 'Toxic' };
    return false;
  },
};
