// pipeline/rules/effect.has_disguise.ts
//
// Intrinsic-only — requires Scryfall's `keywords` array to include "Disguise"
// AND the keyword to appear either on a standalone keyword-block line
// (e.g. "Disguise {4}{B}") via the isIntrinsicKeyword helper, OR (defensively)
// as a regex match on the cost-block syntax. The dual-layer mirrors
// `effect.has_ward`: Scryfall's `keywords` array is authoritative; the text
// check is a defense against parser drift.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { isIntrinsicKeyword } from '../normalize';

// Regex fallback for the cost-block syntax "disguise {N}", "disguise {X}{...}".
// The required `\{` anchors against incidental word use ("the rogue donned a
// disguise" cannot match). The word boundary on the left prevents matches
// against compound words.
const DISGUISE_COST = /\bdisguise\s*\{/;

export const tagDef: TagDef = {
  tagId: 'effect.has_disguise',
  axis: 'effect',
  label: 'Has disguise',
  description:
    'Has the Disguise keyword as a printed intrinsic ability. The card can be cast face-down for {3} as a 2/2 creature with ward {2}, and turned face up any time by paying its disguise cost.',
  pairsWith: ['trigger.turned_face_up'],
};

export const rule: Rule = {
  id: 'effect.has_disguise',
  axis: 'effect',
  matchCard: (card, normalized) => {
    if (!card.keywords.includes('Disguise')) return false;
    // Scryfall's keywords array is authoritative — the keyword check above is
    // sufficient. The text probes below just pick the most informative evidence
    // label; fall back to a generic label when oracle text is absent.
    if (isIntrinsicKeyword(card.oracleText, 'Disguise')) return { evidence: 'Disguise' };
    if (DISGUISE_COST.test(normalized)) return { evidence: 'Disguise (cost block)' };
    return { evidence: 'Disguise (keyword)' };
  },
};
