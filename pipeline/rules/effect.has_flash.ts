// pipeline/rules/effect.has_flash.ts
//
// Intrinsic-only — requires the Flash keyword in Scryfall's `keywords` array
// AND on a standalone keyword-block line via `isIntrinsicKeyword`. This avoids
// the recurring "keyword-grant leaking into has_<keyword>" problem (e.g.
// "creatures you control have flash" cards). Grants-to-others isn't currently
// modeled for Flash (rare in Standard).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_flash',
  axis: 'effect',
  label: 'Has flash',
  description: 'Has the flash keyword as a printed intrinsic ability.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'effect.has_flash',
  axis: 'effect',
  matchCard: (card) =>
    card.keywords.includes('Flash') && isIntrinsicKeyword(card.oracleText, 'Flash')
      ? { evidence: 'Flash' }
      : false,
};
