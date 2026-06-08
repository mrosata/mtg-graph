// pipeline/rules/condition.cares_enchantments.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_enchantments',
  axis: 'condition',
  label: 'Cares about enchantments',
  description: 'References enchantment count, enchantment ETBs, or enchantments you control.',
  pairsWith: [],
};

const PATTERNS = [
  /\bwhenever [\w\s]+? (?:cast(?:s)?\s+(?:an?\s+)?enchantment|enchantment [\w\s]+? enters)\b/,
  /\bfor each (?:[\w\s\-]+? )?enchantments? (?:you control )?/,
  // v0.38.0 — Batch 4: anti-selector lookbehinds mirroring
  // cares_artifacts.ts precedent. Adagia (copy of target enchantment),
  // Moonlit Meditation-style enchant N you control, etc. are selectors,
  // not enchantment-payoff resource frames. The `or `/`and/or ` lookbehinds
  // handle the disjunctive shape "copy of target artifact or enchantment
  // you control" where the enchantment word is the second disjunct of a
  // selector phrase introduced earlier in the sentence.
  /(?<!target\s)(?<!enchant\s)(?<!copy of an?\s)(?<!copy of\s)(?<!choose an?\s)(?<!choose\s)(?<!artifact or\s)(?<!artifact and\/or\s)\benchantments? you control\b/,
  /\bif you control (?:[\d]+ or more |[\w\s\-]+ )?enchantments?\b/,
  // v0.21.0 — Inquisitive Glimmer: static frame "enchantment/aura spells you
  // cast cost {N} less" — cost-reduction payoff scoped to enchantments cast
  // by the controller.
  /\b(?:enchantment|aura)\s+spells?\s+you\s+cast\b/,
];

export const rule: Rule = {
  id: 'condition.cares_enchantments',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['enchantment', 'enchantments'], proximity: ['cast', 'control', 'enters', 'each'], window: 6 },
};
