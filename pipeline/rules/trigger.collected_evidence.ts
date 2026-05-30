// pipeline/rules/trigger.collected_evidence.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.collected_evidence',
  axis: 'trigger',
  label: 'On collecting evidence',
  description:
    'Triggers each time the controller collects evidence (the keyword action). Distinct from `condition.evidence_collected`, which is the one-shot modal gate fired by "if evidence was collected".',
  pairsWith: ['effect.collect_evidence'],
};

// Two trigger frames:
//   - Direct: "whenever you collect evidence" (no count suffix — distinct
//     from the producer's "collect evidence N" keyword-action form).
//   - Reflexive (v0.14.9, Incinerator of the Guilty): "may collect evidence
//     N. When you do, [effect]" — a delayed trigger created by the
//     keyword action. Semantically the card cares about collecting
//     evidence as a precondition for the trailing effect, so pairing with
//     evidence-producers is the right graph edge.
const PATTERN_DIRECT = /\bwhenever you collect evidence\b/;
const PATTERN_REFLEXIVE = /\bcollect evidence (?:\d+|x)\.\s+when you do\b/;

export const rule: Rule = {
  id: 'trigger.collected_evidence',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN_DIRECT) ?? t.match(PATTERN_REFLEXIVE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['collect evidence'],
    proximity: ['whenever you'],
    window: 3,
  },
};
