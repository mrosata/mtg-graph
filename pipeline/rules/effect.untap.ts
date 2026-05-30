// pipeline/rules/effect.untap.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.untap',
  axis: 'effect',
  label: 'Untaps a permanent',
  description: 'Untaps a target permanent.',
  pairsWith: ['trigger.tapped_or_untapped'],
};

// Match "untap [up to N | all] [target] [adjectives] (creature|permanent|artifact|land)[s]".
// The verb-noun structure intentionally excludes the steady-state phrase
// "doesn't untap during your untap step" — that phrase has no permanent-typed
// noun immediately after "untap" (it's followed by "during"). `__self__` is
// added to the noun alternation so self-untap effects (Yenna, Redtooth Regent
// — "untap Yenna") match. Self-untap on a creature card is a meaningful
// effect (lets a tap-cost activation be re-used in the same turn) — unlike
// self-tap which is typically a cost (handled by effect.tap's exclusion).
//
// v0.14.1:
//   - Negative lookbehind for "whenever (you|...) " — observing an untap
//     event (Millennium Calendar) is trigger.tapped_or_untapped, not an
//     effect-axis untap.
//   - Disallow "one or more" inside the filler (only appears in trigger
//     quantifiers like "untap one or more permanents").
const PATTERN = /(?<!\bwhenever (?:you|a|an|another)\s)\buntap (?:up to (?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) |all )?(?!one or more\b)(?:target )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|land|enchantment|__self__)s?\b/;

// Pronoun form (v0.12.9): "Untap it." / "Untap them." following a sentence
// that established a target creature(s) referent (Leaping Ambush, Acrobatic
// Leap). Bounded back-reference window keeps this from firing across
// unrelated paragraphs.
const PRONOUN_PATTERN = /\b(?:target (?:[\w\-]+\s+){0,4}creatures?|creatures? you control)[^.]*\.\s*untap (?:it|them)\b/;

// v0.14.1 — Vigilance-style static rider: "Untap this creature during (each
// other player's )?untap step." Per AGREED PLAN, this static modifier on
// combat untap is out of scope for effect.untap (Thousand Moons Infantry).
//
// v0.14.9 — extended to also cover:
//   - Negated form: "(may) choose not to untap this creature during ..."
//     (Hedge Whisperer: vigilance-inverse static that supports tap-to-
//     animate-land combos).
//   - "your" determiner alongside "each other player's" (covers cards that
//     decline to untap during the controller's own untap step).
const STATIC_RIDER = /\b(?:(?:may )?choose not to )?untap this creature during (?:your |each other player'?s? )?untap step\b/;

export const rule: Rule = {
  id: 'effect.untap',
  axis: 'effect',
  match: (t) => {
    if (STATIC_RIDER.test(t)) {
      // Re-check whether anything else in the text would still fire untap;
      // narrow scope keeps the rider exclusion from masking unrelated effects
      // on the same card.
      const after = t.replace(STATIC_RIDER, '');
      const m = after.match(PATTERN) ?? after.match(PRONOUN_PATTERN);
      return m ? { evidence: m[0] } : false;
    }
    const m = t.match(PATTERN) ?? t.match(PRONOUN_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['untap'], proximity: ['creature', 'permanent', 'target', 'all'], window: 6 },
};
