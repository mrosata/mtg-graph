// pipeline/rules/condition.cares_suspected.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_suspected',
  axis: 'condition',
  label: 'Cares about suspected creatures',
  description:
    'Triggers, scales, gates, or targets based on whether a creature is suspected. Includes anti-suspect statics ("can\'t become suspected") since they reference the same status.',
  pairsWith: ['effect.suspect', 'effect.unsuspect'],
};

// Six frames cover modern carer templating:
//   1. Gate clauses: "is/are/was/were/it's/they're (not) suspected"
//      — the (?!no longer\s+) lookahead blocks the clearer's "is no longer
//      suspected" frame from double-firing on this rule.
//   2. Target removal: "target suspected creature" / "target suspected <tribe>"
//   3. Sacrifice cost: "sacrifice a suspected creature" / "sacrifice a
//      suspected <tribe>"
//   4. Possessive control reference (post-positioned): "(no |any )?suspected
//      creature(s)? you control" / "<tribe>(s)? you control"
//      (Clandestine Meddler, Deadly Complication, Rune-Brand Juggler)
//   5. Possessive control reference (pre-positioned): "you control (no |any )?
//      suspected creature(s)?" / "<tribe>(s)?"
//      (Case of the Stashed Skeleton's "you control no suspected Skeletons"
//      — Case-card "to solve" framing inverts the usual word order)
//   6. Anti-suspect static: "can't become suspected"
//
// The \w+ slot in the typed alternations is intentionally liberal (any
// subtype-shaped word) rather than restricted to THEME_TRIBES. See the
// design doc rationale.
const PATTERNS = [
  /\b(?:is|are|was|were|it's|they're)\s+(?:not\s+)?(?!no longer\s+)suspected\b/,
  /\btarget suspected (?:creature|\w+)\b/,
  /\bsacrifice a suspected (?:creature|\w+)\b/,
  /\b(?:no |any )?suspected (?:creature|\w+)s? you control\b/,
  /\byou control (?:no |any )?suspected (?:creature|\w+)s?\b/,
  /\bcan't become suspected\b/,
];

export const rule: Rule = {
  id: 'condition.cares_suspected',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['suspected'],
    proximity: ['is', 'are', 'was', 'target', 'sacrifice', 'control', "can't become"],
    window: 6,
  },
};
