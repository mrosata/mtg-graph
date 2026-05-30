// pipeline/rules/effect.collect_evidence.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.collect_evidence',
  axis: 'effect',
  label: 'Collect Evidence',
  description:
    'MKM keyword action. Exile cards from your graveyard with total mana value N or greater (as additional cost, alt cost, activated-ability cost, or optional triggered cost). Producer for `condition.evidence_collected` and `trigger.collected_evidence`. Also a form of graveyard-exile — applied via `children` expansion to `effect.exile_from_graveyard`.',
  pairsWith: [
    'condition.evidence_collected',
    'trigger.collected_evidence',
    'condition.cares_graveyard',
    'condition.cares_exile_pile',
  ],
  children: ['effect.exile_from_graveyard'],
};

// Match the keyword-action phrase "collect evidence N" where N is a digit
// (typically 2, 3, 4, 6, 8, 10) or the literal letter x (variable form,
// e.g. Urgent Necropsy). The (?<!ward—) lookbehind excludes Axebane
// Ferox's "Ward—Collect evidence 4" ward-cost frame: in that frame the
// OPPONENT collects evidence to keep their spell on the stack — the
// controller is not collecting. Same axis-flip pattern as the suspect
// family's edict carve-out.
//
// The trailing \b ensures we don't match the verb form "you collect
// evidence" (no numeric suffix) used in the per-collect trigger phrase.
const PATTERN = /(?<!ward—)\bcollect evidence (?:\d+|x)\b/;

export const rule: Rule = {
  id: 'effect.collect_evidence',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['collect evidence'],
    proximity: ['additional cost', 'rather than pay', 'may', '{t}', 'whenever'],
    window: 8,
  },
};
