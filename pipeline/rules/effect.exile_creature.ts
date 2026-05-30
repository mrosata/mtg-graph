// pipeline/rules/effect.exile_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_creature',
  axis: 'effect',
  label: 'Exiles a creature',
  description: 'Exiles a target creature from the battlefield, including replacement effects that exile instead of die.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield'],
};

const PATTERN_OWN =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+(?:other\s+|another\s+)?)?(?:another\s+|target\s+|each\s+|all\s+|enchanted\s+|equipped\s+)(?:[\w\-]+[,\s]+){0,6}?creatures?(?! cards?)\b/;

const PATTERN_BROAD =
  /\bexile(?:s)?\s+(?:up to (?:one|two|three|four|five|\w+)\s+)?(?:another\s+|target\s+|each\s+|all\s+)(?!(?:[\w\-]+\s+){0,5}noncreature\s+)(?:[\w\-]+\s+){0,5}?(?:nonland\s+|nontoken\s+)?permanents?(?! cards?)\b/;

// Replacement: "if [a creature|it|that creature] would die ... exile [it|that creature] instead"
const PATTERN_REPLACEMENT =
  /(?:would die|would be destroyed)[^.]*?,\s+exile (?:it|that creature|them) instead/;

// v0.14.9 — dies-trigger exile (Illicit Masquerade): "whenever a creature ...
// dies, exile it." The creature has died and the trigger exiles it from
// the graveyard, permanently removing it. Functionally creature-removal
// for graph-edge purposes (pairs with creature_dies / leaves_battlefield).
const PATTERN_DIES_EXILE =
  /\bdies,\s+exile (?:it|that creature|them)\b/;

// Anaphoric: "target creature" antecedent in prior sentence, then "exile it" later.
// Requires `target creature` (+ optional modifiers) to appear, then within ~200 chars
// `exile it` follows. The `[^.]{0,200}` window prevents crossing very long unrelated text.
// We also require the exile isn't "from your graveyard/hand/library" (zone qualifier).
const PATTERN_ANAPHORIC =
  /\btarget (?:[\w\-]+\s+){0,6}creature\b[^.]*?\.[^.]{0,200}\bexile it(?!\s+from\s+(?:your\s+)?(?:graveyard|hand|library|exile))\b/;
// Also handle single-sentence anaphoric: "whenever target creature attacks, exile it"
const PATTERN_ANAPHORIC_SAME_SENTENCE =
  /\btarget (?:[\w\-]+\s+){0,6}creature\b[^.]*?\bexile it(?!\s+from\s+(?:your\s+)?(?:graveyard|hand|library|exile))\b/;

// Flicker frame: "exile … Return [it|them|that creature|target creature] to the
// battlefield". This is bounce/blink (covered by `effect.bounce_creature`), not
// removal. If the local tail contains a "return … to the battlefield" clause we
// suppress the exile-as-removal interpretation.
const FLICKER_TAIL = /\breturn (?:it|them|that creature|target creature|those creatures|each of those cards)\b[^.]*?\bto the battlefield\b/;

// Split-mode punisher: "exile X. if you controlled it, return it to the
// battlefield ..." gates the return on ownership. For opponent-controlled
// targets the card is removal-with-replacement, not flicker — Unyielding
// Gatekeeper is the canonical case. When the return is conditioned on this
// preamble we must NOT suppress the exile tag.
const CONDITIONAL_RETURN_PREAMBLE =
  /\bif you controlled (?:it|them|that (?:creature|artifact|permanent|nonland permanent))\b/;

export const rule: Rule = {
  id: 'effect.exile_creature',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN_OWN) ??
      t.match(PATTERN_BROAD) ??
      t.match(PATTERN_REPLACEMENT) ??
      t.match(PATTERN_DIES_EXILE) ??
      t.match(PATTERN_ANAPHORIC) ??
      t.match(PATTERN_ANAPHORIC_SAME_SENTENCE);
    if (!m || m.index === undefined) return false;
    // Check the next ~200 chars after the match for a flicker tail.
    const tail = t.slice(m.index + m[0].length, m.index + m[0].length + 200);
    const flicker = FLICKER_TAIL.exec(tail);
    if (flicker && flicker.index !== undefined) {
      // Suppress only when the return isn't conditioned on "if you controlled
      // it" (split-mode punisher). Check the slice of tail before the return
      // clause for the conditional preamble.
      const beforeReturn = tail.slice(0, flicker.index);
      if (!CONDITIONAL_RETURN_PREAMBLE.test(beforeReturn)) return false;
    }
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['exile'], proximity: ['creature', 'permanent', 'die'], window: 10 },
};
