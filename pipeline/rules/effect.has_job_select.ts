// pipeline/rules/effect.has_job_select.ts
//
// Job select keyword (FIN) — Equipment ETB that creates a 1/1 colorless Hero
// creature token and attaches itself. Read from Scryfall's `keywords` array.
// Theme-category filter tag. Pairs with Hero-tribal and Equipment-archetype
// payoffs since the keyword silently produces both.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_job_select',
  axis: 'effect',
  label: 'Has Job select',
  description:
    'Has the Job select keyword — an Equipment ETB that creates a 1/1 Hero creature token and attaches itself. Implicit Hero-token producer and self-attach Equipment.',
  pairsWith: ['condition.cares_artifacts'],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_job_select',
  axis: 'effect',
  matchCard: (card) => (card.keywords.includes('Job select') ? { evidence: 'Job select' } : false),
};
