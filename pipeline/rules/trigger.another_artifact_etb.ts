// pipeline/rules/trigger.another_artifact_etb.ts
//
// Has an ability that triggers when an artifact (other than itself) enters
// the battlefield. Symmetric to trigger.another_creature_etb. Self-ETB on
// an artifact card uses "this artifact" subject and is captured by
// trigger.self_etb instead.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.another_artifact_etb',
  axis: 'trigger',
  label: 'Triggers when another artifact enters',
  description: 'Has an ability that triggers when an artifact (other than itself) enters the battlefield.',
  pairsWith: [
    'effect.create_treasure',
    'effect.create_food',
    'effect.create_clue',
    'condition.cares_artifacts',
  ],
};

export const rule: Rule = {
  id: 'trigger.another_artifact_etb',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(
      /whenever (?:a |an |another |one or more )?artifacts?(?:\s+\w+){0,3}\s+enters?/,
    );
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['artifact', 'artifacts'], window: 6 },
};
