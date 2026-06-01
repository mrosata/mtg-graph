// pipeline/rules/effect.exile_creature.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_TRIBES, tribePattern } from '../themes';

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
// v0.23 — admit `that creature` and `them` in addition to `it`, mirroring the
// pronoun group already used by PATTERN_DIES_EXILE (Turncoat Kunoichi:
// "choose target creature an opponent controls. exile that creature until …").
const PATTERN_ANAPHORIC =
  /\btarget (?:[\w\-]+\s+){0,6}creature\b[^.]*?\.[^.]{0,200}\bexile (?:it|that creature|them)(?!\s+from\s+(?:your\s+)?(?:graveyard|hand|library|exile))\b/;
// Also handle single-sentence anaphoric: "whenever target creature attacks, exile it"
const PATTERN_ANAPHORIC_SAME_SENTENCE =
  /\btarget (?:[\w\-]+\s+){0,6}creature\b[^.]*?\bexile (?:it|that creature|them)(?!\s+from\s+(?:your\s+)?(?:graveyard|hand|library|exile))\b/;

// FIX 8 (BR-3) — Token-sweep on a creature subtype (Abyssal Harvester:
// "exile all other Nightmare tokens you control"). Most THEME_TRIBES entries
// are creature subtypes; this prevents over-match on artifact-type tokens
// (Treasure / Food / Clue / Map) by requiring the noun to be a known creature
// tribe. Nightmare is added inline since it's the canonical case for this
// arm and not currently in THEME_TRIBES (no `condition.cares_tribe.nightmare`
// payoffs in Standard to warrant promotion).
const TRIBE_ALT = [
  ...THEME_TRIBES.map(tribePattern),
  'nightmares?',
].join('|');
const PATTERN_TOKEN_SWEEP = new RegExp(
  `\\bexiles?\\s+(?:another\\s+|target\\s+|each\\s+|all\\s+)(?:other\\s+)?(?:${TRIBE_ALT})\\s+tokens?\\s+you control\\b`,
);

// v0.21.0 — Anaphoric "you may exile it" with combat-verb antecedent on a
// "creature you control" subject. The antecedent isn't an explicit "target
// creature" — it's the creature that triggered the ability via attack/block/
// ETB/damage. The FLICKER_TAIL suppression (extended to also catch impulse-
// recast tails like "play that card from exile") handles Norin Swift
// Survivalist's "you may play that card from exile" tail.
const PATTERN_COMBAT_ANAPHORIC =
  /\b(?:another\s+creature|a\s+creature|creatures?\s+you\s+control)[^.]{0,40}?(?:becomes blocked|attacks|enters|deals damage)[^.]{0,40}?,\s*you may exile it\b/;

// Flicker frame: "exile … Return [it|them|that creature|target creature] to the
// battlefield". This is bounce/blink (covered by `effect.bounce_creature`), not
// removal. If the local tail contains a "return … to the battlefield" clause we
// suppress the exile-as-removal interpretation.
// v0.21.0 — Norin, Swift Survivalist: also suppress on impulse-cast tail
// ("play that card from exile (this turn)?"). The exile is followed by
// permission to play the exiled card — same axis as flicker (the card isn't
// permanently removed).
const FLICKER_TAIL = /\b(?:return (?:it|them|that creature|target creature|those creatures|each of those cards)\b[^.]*?\bto the battlefield|play (?:it|that card) from exile)\b/;

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
      t.match(PATTERN_ANAPHORIC_SAME_SENTENCE) ??
      t.match(PATTERN_COMBAT_ANAPHORIC) ??
      t.match(PATTERN_TOKEN_SWEEP);
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
