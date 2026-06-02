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
  // v0.20 — admit optional "then" filler before the anaphoric "it deals"
  // (Rabid Gnaw: "target creature you control fights ... . then it deals
  // damage ..."). The sentence-boundary anchor stays the same.
  // v0.33+ — relax tail to admit "up to (one|two|three) target creature"
  // (Assert Perfection).
  /\btarget creature(?:s)? you control\b[^.]*\.\s+(?:then\s+)?it deals damage equal to its (?:power|toughness) to (?:up to (?:one|two|three) )?target creature\b/,
  // v0.33+ — Champion of the Path: tribal-ETB anaphoric "whenever
  // (another|a) <tribe> you control enters, it deals damage equal to its
  // (power|toughness)". Tight: single-word tribe slot, comma required, no
  // intervening period.
  /\bwhenever (?:another|a)\s+[\w\-]+\s+you control enters,\s+it deals damage equal to its (?:power|toughness)\b/,
  // Group-bolt — Case of the Gateway Express:
  // "Each creature you control deals N damage to …"
  /\beach creature you control deals \d+ (?:combat )?damage\b/,
  // 2026-06-01 audit batch — Bartz and Boko: tribal-scoped group damage
  // "each other Bird you control deals damage equal to its power to target
  // creature an opponent controls". The subject is a tribe noun (plural or
  // singular with "each other") rather than the literal "creature".
  // Tightly scoped: requires "each (other )?<word> you control deals"
  // followed by either "<N>/<X> damage" or "damage equal to" so we don't
  // FP on prose like "each food you control deals" (foods can't deal).
  /\beach\s+(?:other\s+)?[a-z][\w\-]*?\s+you control\s+deals?\s+(?:\d+|x)\s+(?:combat\s+)?damage\b/,
  /\beach\s+(?:other\s+)?[a-z][\w\-]*?\s+you control\s+deals?\s+(?:combat\s+)?damage\s+equal\s+to\b/,
  // v0.20.0 — target-establishing antecedent + plural-anaphoric "they each
  // deal" or singular "the creature(s) you control deals" (Coordinated
  // Clobbering, Beastie Beatdown). Prior clause establishes "target ...
  // creature(s) you control"; later sentence resolves the damage via the
  // bound noun phrase. The interpolation [\s\S]{0,300} tolerates one or two
  // intervening sentences (Beastie Beatdown has a delirium clause between).
  /\btarget(?:\s+[\w\-]+)?\s+(?:untapped\s+)?creatures? you control\b[\s\S]{0,300}?\.\s*(?:they each|the creature(?:s)? you control)\s+deals?\s+(?:combat\s+)?damage equal to\b/,
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
