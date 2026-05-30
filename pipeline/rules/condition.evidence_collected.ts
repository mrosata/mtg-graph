// pipeline/rules/condition.evidence_collected.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.evidence_collected',
  axis: 'condition',
  label: 'Evidence collected',
  description:
    'One-shot modal/scaling gate. Fires when the collect-evidence cost was paid on this spell or ability ("if evidence was collected, ..."). Consumer for `effect.collect_evidence`.',
  pairsWith: ['effect.collect_evidence'],
};

// Single literal frame. "Evidence" is a low-traffic word in MTG outside
// the MKM mechanic, so a bare phrase match is sufficient. No \b before
// "if" because the phrase typically starts a clause (preceded by "." or
// "," or beginning of text).
const PATTERN = /\bif evidence was collected\b/;

export const rule: Rule = {
  id: 'condition.evidence_collected',
  axis: 'condition',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['evidence was collected'],
    proximity: ['if', 'instead', 'costs'],
    window: 4,
  },
};
