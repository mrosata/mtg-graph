// pipeline/rules/effect.has_ward.ts
//
// Intrinsic-only — requires Scryfall's `keywords` array to include "Ward" AND
// the keyword to appear either on a standalone keyword-block line (mana-cost
// form, e.g. "Ward {2}") OR as an em-dash cost form ("Ward—Collect evidence 4",
// "Ward—Pay 3 life"). The em-dash form bypasses isIntrinsicKeyword (which skips
// lines containing em-dashes) via a direct regex match on the normalized text.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

// Matches the em-dash Ward variant: "ward—<cost>" at a word boundary.
// The em-dash (U+2014) is preserved verbatim by the normalizer.
const WARD_EM_DASH = /\bward—\S/;

export const tagDef: TagDef = {
  tagId: 'effect.has_ward',
  axis: 'effect',
  label: 'Has ward',
  description: 'Has the ward keyword as a printed intrinsic ability (mana-cost, life-cost, or em-dash action-cost suffix).',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_ward',
  axis: 'effect',
  matchCard: (card, normalized) => {
    if (!card.keywords.includes('Ward')) return false;
    if (isIntrinsicKeyword(card.oracleText, 'Ward')) return { evidence: 'Ward' };
    if (WARD_EM_DASH.test(normalized)) return { evidence: 'Ward (em-dash cost)' };
    return false;
  },
};
