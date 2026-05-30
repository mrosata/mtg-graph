// pipeline/rules/trigger.explored.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.explored',
  axis: 'trigger',
  label: 'Triggers on explore',
  description: 'Has an ability that triggers when a creature you control (or this creature) explores.',
  pairsWith: ['effect.explore'],
};

// "whenever <subject> explores" — payoff side of explore. The subject is most
// commonly "a creature you control" or "__self__". We don't accept the bare
// effect-side phrasing ("it explores" / "target creature explores") — those
// belong to effect.explore.
const PATTERN =
  /\b(?:when|whenever)\s+(?:__self__|(?:a|another|target|each)\s+creature(?:\s+you\s+control)?)\s+explores\b/;

export const rule: Rule = {
  id: 'trigger.explored',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['explores'], proximity: ['whenever', 'when'], window: 4 },
};
