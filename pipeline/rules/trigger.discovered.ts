// pipeline/rules/trigger.discovered.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.discovered',
  axis: 'trigger',
  label: 'Triggers on discover',
  description: 'Has an ability that triggers when you (or a player) discover.',
  pairsWith: ['effect.discover'],
};

// "when/whenever <player> discover[s]" — payoff side of the LCI discover mechanic.
// We require the bare verb (no numeric argument) so the trigger doesn't overlap
// with "discover N" effect text on the same card. The numeric form is the
// action; the bare form ("you discover", "a player discovers") is the trigger.
const PATTERN =
  /\b(?:when|whenever)\s+(?:you|a\s+player|an\s+opponent|each\s+player|each\s+opponent)\s+discovers?\b(?!\s+(?:\d+|x))/;

export const rule: Rule = {
  id: 'trigger.discovered',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['discover'], proximity: ['whenever', 'when', 'you'], window: 4 },
};
