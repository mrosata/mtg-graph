// pipeline/rules/effect.gains_keyword_self_conditional.ts
//
// Companion to `effect.grants_evasion`. The umbrella `grants_evasion` covers
// anthem / token / temporary-gain frames where the subject is OTHER creatures
// (or tokens the card produces). This tag captures the self-conditional shape
// where the card grants an evasion keyword TO ITSELF under a gating condition
// ("this creature has flying as long as …", "__self__ has menace while …").
//
// Splitting these out cleans up two graph-correctness problems with the v0.13
// umbrella:
//   - Didact Echo was incorrectly tagged `grants_evasion` (description says
//     "grants to others or to tokens it creates"), polluting condition.cares_evasion
//     edges with cards that don't actually anthem.
//   - Self-conditional grants are a payoff axis for graveyard / artifact /
//     token-count strategies — by tagging them separately we keep them in the
//     `condition.cares_evasion` consumer surface (the cared-about creature
//     here is __SELF__).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.gains_keyword_self_conditional',
  axis: 'effect',
  label: 'Gains evasion keyword conditionally (self)',
  description: 'This creature/permanent gains an evasion keyword (flying, menace, intimidate) under a gating condition ("as long as", "while", "if"). Distinct from anthem-style grants in `effect.grants_evasion`.',
  pairsWith: ['condition.cares_evasion'],
};

// Self subjects: "this <single-word-type>" or "__self__".
// Followed by "has/have/gains? <evasion-keyword>" and a gating connector:
// "as long as", "while", "if". Bounded filler (40 chars) between the keyword
// and the connector so we don't span sentence boundaries.
const SELF_SUBJECT = '(?:this (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)|__self__)';
const KEYWORD = '(?:flying|menace|intimidate)';

const PATTERNS = [
  // Subject — verb — keyword — gate. Keyword may be followed by other prose
  // before the gate ("gets +2/+2 and has flying if you control a swamp").
  new RegExp(`\\b${SELF_SUBJECT}\\b[^.]{0,60}?\\b(?:has|have|gains?)\\s+(?:[\\w\\-\\s,/]{0,80}?\\band\\s+(?:has\\s+|have\\s+|gains?\\s+)?)?${KEYWORD}\\b[^.]{0,40}?\\b(?:as long as|while|if)\\b`),
  // v0.14.6 — Gate-before-subject with anaphoric "it": "as long as <gate>,
  // it has/gains <kw>" (Warden of the Inner Sky). The "it" antecedent is
  // __SELF__ / "this creature" established inside the gate clause itself.
  // Also accept explicit self subjects after the comma for flexibility.
  // v0.14.28 — filler broadened (Living Conundrum): cap 40→80, admit "/"
  // for stat notation ("10/10"), and allow a second verb ("and has flying")
  // to bridge in-clause stat boosts and the keyword.
  new RegExp(`\\b(?:as long as|while|if)\\b[^.]{0,80}?,\\s*(?:it|${SELF_SUBJECT})\\s+(?:has|have|gains?)\\s+(?:[\\w\\-\\s,/]{0,80}?\\band\\s+(?:has\\s+|have\\s+|gains?\\s+)?)?${KEYWORD}\\b`),
];

export const rule: Rule = {
  id: 'effect.gains_keyword_self_conditional',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['as long as', 'while'], proximity: ['flying', 'menace', '__self__'], window: 12 },
};
