// pipeline/rules/effect.look_at_top_n.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.look_at_top_n',
  axis: 'effect',
  label: 'Looks at top of library',
  description: 'Reveals or looks at the top N cards of a library.',
  pairsWith: [],
};

// Plural form: "look at/reveal the top <N> cards of [whose] library".
// Spelled-out numbers cover the common values in Standard print runs
// (one..ten plus twelve/fifteen/twenty for big-show payoffs).
const PATTERN_PLURAL = /\b(?:look at|reveal) (?:the )?top (?:\d+|x|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty) cards of [\w\s']+? library\b/;
// Singular form: "look at/reveal the top card of [whose] library"
const PATTERN_SINGLE = /\b(?:look at|reveal) the top card of [\w\s']+? library\b/;
// v0.14.1 — variable-N "from the top of" frame. Ojer Kaslem: "reveal that
// many cards from the top of your library" (combat-damage-driven dig).
const PATTERN_VARIABLE = /\b(?:look at|reveal) (?:that many|\d+|x) cards from the top of [\w\s']+? library\b/;
// v0.20 — multi-token quantifier (Stargaze: "look at twice X cards from the
// top of your library"). The quantifier is a compound expression — a scalar
// adjective ("twice", "three times", "half", "double") followed by a base
// count (N, X, or "that many").
const PATTERN_COMPOUND_QUANT = /\b(?:look at|reveal) (?:twice|three times|half|double) (?:\d+|x|that many) cards from the top of [\w\s']+? library\b/;

export const rule: Rule = {
  id: 'effect.look_at_top_n',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_PLURAL) ??
      t.match(PATTERN_SINGLE) ??
      t.match(PATTERN_VARIABLE) ??
      t.match(PATTERN_COMPOUND_QUANT);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['look', 'reveal'], proximity: ['top', 'library'], window: 6 },
};
