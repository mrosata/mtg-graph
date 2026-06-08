// pipeline/rules/trigger.permanent_leaves_battlefield.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.permanent_leaves_battlefield',
  axis: 'trigger',
  label: 'Triggers when any permanent leaves the battlefield',
  description: 'Triggers when a permanent of any type leaves the battlefield. Reserved for universally-typed phrasings ("a permanent", "another permanent"). Type-specific triggers are tagged on the typed children.',
  pairsWith: [
    'effect.destroy_permanent',
    'effect.exile_from_battlefield',
    'effect.sacrifice_permanent',
    'effect.bounce_or_blink',
    'effect.board_wipe',
  ],
  children: [
    'trigger.creature_leaves_battlefield',
    'trigger.artifact_leaves_battlefield',
    'trigger.enchantment_leaves_battlefield',
    'trigger.planeswalker_leaves_battlefield',
    'trigger.land_leaves_battlefield',
  ],
};

const LTB_VERB = '(?:leaves? the battlefield|(?:is|are) put into a graveyard(?: from the battlefield)?)';

const PATTERN = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a\\s+|an\\s+|another\\s+|the\\s+|each\\s+)(?!(?:[\\w\\-]+\\s+){0,5}(?:noncreature|nonartifact|nonenchantment|nonplaneswalker|nonland|creature|artifact|enchantment|planeswalker|land)\\s+)(?:[\\w\\-]+\\s+){0,4}?permanents?\\s+(?:[\\w\\-\\s]+? )?${LTB_VERB}\\b`,
);

export const rule: Rule = {
  id: 'trigger.permanent_leaves_battlefield',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['leaves the battlefield'], proximity: ['permanent'], window: 6 },
};
