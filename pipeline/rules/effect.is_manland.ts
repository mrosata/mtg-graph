// pipeline/rules/effect.is_manland.ts
//
// "Manland" — a Land with an activated ability that turns it into a creature
// until end of turn (Restless cycle, Mutavault-style). Useful filter for
// midrange/control decks looking for win conditions in their manabase.
//
// Theme/filter today; pairs with nothing because no card in current Standard
// has a payoff that cares specifically about manlands. If one prints (e.g.
// "whenever a land becomes a creature"), wire pairsWith here.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.is_manland',
  axis: 'effect',
  label: 'Manland',
  description:
    'A land that can animate itself into a creature via an activated ability — a manland.',
  pairsWith: [],
  category: 'theme',
};

// "this land becomes a <stats> creature" / "until end of turn, this land
// becomes a <stats> creature". Always preceded by an activation cost so the
// "this land becomes" anchor is reliable.
const PATTERN = /\b(?:this land|__self__)\s+(?:is|becomes)\s+(?:a|an)\b[^.]*?\bcreature\b/;

// FIX 16 (BR-11) — Crawling Barrens: "you may have it become a 0/0
// elemental creature until end of turn." Anaphoric "have it become a
// <stats> creature" frame — same self-animation semantic, just with the
// subject expressed via the anaphor "it" (bound to "this land" earlier
// in the text).
const PATTERN_HAVE_IT_BECOME = /\bhave it become\s+(?:a|an)\b[^.]*?\bcreature\b/;

export const rule: Rule = {
  id: 'effect.is_manland',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if (!card.types.includes('Land')) return false;
    const m = normalizedText.match(PATTERN) ?? normalizedText.match(PATTERN_HAVE_IT_BECOME);
    return m ? { evidence: m[0].slice(0, 80) } : false;
  },
};
