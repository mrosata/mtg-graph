// pipeline/rules/effect.causes_damage.ts
//
// Indirect damage — the card causes damage via another permanent. Companion
// to `effect.deals_damage` which is intentionally self-only. The split
// matters for graph edges: a Fling-style card pairs with damage payoffs the
// same way a Lightning Strike does, even though the literal damage source
// is the sacrificed creature rather than this card.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.causes_damage',
  axis: 'effect',
  label: 'Causes damage (indirect)',
  description: 'Causes damage to be dealt via another permanent (typically "target creature you control deals damage equal to its power..."). Companion to `effect.deals_damage` which covers self-sourced damage.',
  pairsWith: ['trigger.damage_dealt', 'trigger.life_changed'],
};

// External-subject damage frames — "target/equipped/enchanted/another
// creature deals N damage" / "deals X damage" / "deals damage equal to".
// The subject is explicitly NOT __SELF__ or "this creature" (those are
// covered by effect.deals_damage). Trigger contexts ("whenever a creature
// deals damage") still don't match because there's no preceding qualifier
// like target/equipped/another there.
const SUBJECTS = '(?:target|enchanted|equipped|another|that)';
const CREATURE_PHRASE = `${SUBJECTS}\\s+(?:[\\w\\-]+\\s+){0,4}?creature(?:s)?(?:\\s+you control|\\s+you don't control|\\s+an opponent controls)?`;

const PATTERNS = [
  new RegExp(`\\b${CREATURE_PHRASE}\\s+deals \\d+ (?:combat )?damage\\b`),
  new RegExp(`\\b${CREATURE_PHRASE}\\s+deals x (?:combat )?damage\\b`),
  new RegExp(`\\b${CREATURE_PHRASE}\\s+deals (?:combat )?damage equal to\\b`),
  // Plural "creatures … each deal damage equal to their power" — Graceful
  // Takedown, fight-style spells targeting multiple creatures. The subject can
  // be a compound noun phrase with "and"/"or" joining multiple creature
  // targets ("any number of target enchanted creatures you control and up to
  // one other target creature you control each deal damage equal to their
  // power…"), so we cap filler at 120 chars and allow "each" before "deal".
  new RegExp(`\\b${SUBJECTS}\\s+(?:[\\w\\-]+\\s+){0,6}?creatures(?:\\s+you control|\\s+you don't control|\\s+an opponent controls)?[^.]{0,120}?\\s+each\\s+deal\\s+(?:combat\\s+)?damage\\s+equal\\s+to\\b`),
  // Anaphoric "it" — Bite Down on Crime / Archdruid's Charm:
  // A prior clause establishes "target creature you control", then a new
  // sentence starts with "it deals damage equal to its power". The sentence
  // boundary (\.\s+) keeps us from matching free-floating "it deals" fragments.
  /\btarget creature(?:s)? you control\b[^.]*\.\s+it deals damage equal to its (?:power|toughness) to target creature\b/,
  // Group-bolt — Case of the Gateway Express:
  // "Each creature you control deals N damage to …"
  /\beach creature you control deals \d+ (?:combat )?damage\b/,
];

export const rule: Rule = {
  id: 'effect.causes_damage',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['deals'], proximity: ['target', 'enchanted', 'equipped', 'damage'], window: 6 },
};
