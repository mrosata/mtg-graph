// pipeline/rules/effect.proliferate.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.proliferate',
  axis: 'effect',
  label: 'Proliferate',
  description:
    'Triggers or executes the proliferate keyword action (add an additional counter of each kind already on a permanent or player).',
  pairsWith: [
    'condition.cares_plus_one_counter',
    'condition.cares_energy',
    'condition.cares_poison',
  ],
};

export const rule: Rule = {
  id: 'effect.proliferate',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if (card.keywords.includes('Proliferate')) return { evidence: 'Proliferate' };
    const m = normalizedText.match(/\bproliferate\b/);
    if (m) return { evidence: m[0] };
    // v0.50 (S12) — functional proliferate spelled out in comp-rules prose
    // without the keyword (Powerful Broker: "for each kind of counter on
    // target permanent or player, give that permanent or player another
    // counter of that kind"). Identical semantics to the keyword action.
    const functional = normalizedText.match(
      /\bfor each kind of counter on (?:target|each|a|any) (?:permanent or player|player or permanent|permanent|player)\b[^.]{0,80}?\banother counter of that kind\b/,
    );
    return functional ? { evidence: functional[0] } : false;
  },
  nearMiss: { anchors: ['proliferate'], proximity: ['counter'], window: 5 },
};
