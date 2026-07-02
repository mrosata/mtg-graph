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
    // v0.15 — post-noun qualifier slot widened from {0,3} → {0,8} to admit
    // "with mana value N or greater" tails (Simulacrum Synthesizer).
    // Parallel to v0.14.13 widening on trigger.another_creature_etb.
    // FG-5a — pre-qualifier slot `(?:[\w\-]+\s+)?` before `artifacts?`
    // admits "nontoken artifact", "nonlegendary artifact", etc. (Ultron).
    // FG-5b — noun extended to also accept "equipment" (Thunder Lasso-style
    // triggers where the Equipment ETB fires instead of bare "artifact").
    const m = t.match(
      /whenever (?:a |an |another |one or more )?(?:[\w\-]+\s+)?(?:artifacts?|equipment)(?:\s+\w+){0,8}\s+enters?/,
    );
    if (m) return { evidence: m[0] };
    // FG-5c — compound "X and/or artifact" form (HYDRA cards). The compound
    // noun pairs a tribe type with "artifact" joined by "and/or". The phrase
    // is unambiguously an artifact-ETB trigger even when the leading noun
    // is another type.
    const compound = t.match(
      /whenever (?:a |an |another |one or more )?\w+\s+and\/or\s+artifacts?(?:\s+\w+){0,8}\s+enters?/,
    );
    if (compound) return { evidence: compound[0] };
    // v0.15 — broad "noncreature, nonland permanents" superset framing
    // (Builder's Talent). Covers artifact + enchantment + planeswalker
    // permanents — fires both this trigger and another_enchantment_etb.
    const broad = t.match(
      /whenever (?:a |an |another |one or more )?(?:noncreature, nonland|nonland, noncreature) permanents?(?:\s+\w+){0,8}\s+enters?/,
    );
    return broad ? { evidence: broad[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['artifact', 'artifacts'], window: 6 },
};
