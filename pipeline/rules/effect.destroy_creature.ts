// pipeline/rules/effect.destroy_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.destroy_creature',
  axis: 'effect',
  label: 'Destroys a creature',
  description: 'Destroys a target creature — directly, in a board wipe scoped to creatures, or via a broad effect like "destroy target permanent" that necessarily covers creatures.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield'],
};

// Pattern A: own type. Determiner alternation includes the pronoun
// back-reference "that" (Kellan's Lightblades — "destroy that creature
// instead" after a preceding "target ... creature"). The count slot accepts
// both `up to N` and a bare numeric `N` (Curtains' Call: "destroy two target
// creatures"; Hex: "destroy three target creatures").
const PATTERN_OWN =
  /\bdestroy(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+|that\s+)(?:[\w\-]+[,\s]+){0,6}?creatures?\b/;

// Pattern B: type-inclusive broad ("destroy ... permanent" without a "noncreature" modifier).
const PATTERN_BROAD =
  /\bdestroy(?:s)?\s+(?:(?:up to\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+|that\s+)(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?permanents?\b/;

// Pattern C (v0.20.0): antecedent-anchored "destroy it" — Cracked Skull aura
// ("when enchanted creature is dealt damage, destroy it") and the generic
// "target creature ... . destroy it" sentence-bounded shape. Bare "destroy
// it" still excluded; both arms require a creature-typed antecedent.
// v0.23 — admit interleaved tap/attack/block trigger conditions (Cryoshatter:
// "when enchanted creature becomes tapped or is dealt damage, destroy it").
// Enumerated verb alternation (not `[^.]{0,80}?`) avoids over-match on
// "enchanted creature can't be the target of …, destroy it" style spans.
const PATTERN_ENCHANTED =
  /\benchanted creature (?:is dealt damage|becomes tapped|attacks|blocks)(?:\s+or\s+(?:is dealt damage|becomes tapped|attacks|blocks))?[^.]{0,40}?,\s*destroy it\b/;
const PATTERN_TARGET_THEN_DESTROY =
  /\btarget creature[^.]*\.\s*destroy it\b/;

export const rule: Rule = {
  id: 'effect.destroy_creature',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_ENCHANTED) ??
      t.match(PATTERN_TARGET_THEN_DESTROY);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['destroy'], proximity: ['creature', 'permanent'], window: 8 },
};
