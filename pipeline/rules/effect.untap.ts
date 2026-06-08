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
// 2026-06-02 audit batch — Fancy Footwork: "untap one or two target
// creatures". Admit "one or two" alongside "up to N" in the count slot.
const PATTERN = /(?<!\bwhenever (?:you|a|an|another)\s)\buntap (?:up to (?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) |one or two |all )?(?!one or more\b)(?:target )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|land|enchantment|__self__)s?\b/;

// v0.33+ — Subtype-noun-slot broadening. Deepchannel Duelist
// ("untap target Merfolk you control"). The noun is a creature subtype not
// in the generic whitelist; require a `you control` anchor on the right
// side to prevent over-fire on phrases like "untap step".
const PATTERN_SUBTYPE = /(?<!\bwhenever (?:you|a|an|another)\s)\buntap (?:target |another untapped )(?:[\w\-]+ ){0,3}[\w\-]+s? you control\b/;

// v0.33+ — "untap each other <subtype> you control" plural form
// (Deepway Navigator). Distinct from PATTERN because the count slot uses
// "each other" rather than "up to N" / "all".
const EACH_OTHER_PATTERN = /\buntap each (?:other )?[\w\-]+ you control\b/;

// Pronoun form (v0.12.9): "Untap it." / "Untap them." following a sentence
// that established a target creature(s) referent (Leaping Ambush, Acrobatic
// Leap). Bounded back-reference window keeps this from firing across
// unrelated paragraphs.
// 2026-06-02 audit batch — Living Brain, Mechanical Marvel: "untap it"
// anaphoric to a "target ... artifact" antecedent (the artifact becomes a
// creature via a preceding clause). Broaden the antecedent slot to admit
// artifacts and permanents alongside creatures.
//
// v0.33+ — broaden antecedent to admit "creatures target player controls"
// (Trystan's Command). The shape is plural-noun + "target player controls"
// rather than "target X" / "X you control".
const PRONOUN_PATTERN = /\b(?:target (?:[\w\-]+\s+){0,4}(?:creatures?|artifacts?|permanents?)|creatures? you control|artifacts? you control|permanents? you control|(?:creatures?|artifacts?|permanents?)\s+target player controls?)[^.]*\.\s*untap (?:it|them)\b/;

// v0.33+ — Broadcast Takeover: "gain control of all artifacts your
// opponents control until end of turn. Untap them." The antecedent is a
// "gain control of" clause rather than "target X / X you control".
const GAIN_CONTROL_PRONOUN = /\bgain control of [^.]{0,80}?\.\s*untap them\b/;

// v0.20.0 — tribal-list antecedent: "<tribe>s, <tribe>s, ..., and <tribe>s
// you control get +X/+Y until end of turn. Untap them." Valley Floodcaller
// uses a multi-tribe plural-list subject without the generic "creatures"
// noun, so PRONOUN_PATTERN misses. Requires plural tribal nouns + "you
// control" + a buff clause + sentence boundary + "untap them" — bare
// "untap them" stays unmatched.
const TRIBAL_LIST_PRONOUN_PATTERN = /\b[\w\-]+s(?:,\s+[\w\-]+s){0,4}(?:,?\s+and\s+[\w\-]+s)?\s+you control\s+get[^.]*\.\s*untap them\b/;

// v0.20 — Threaten-shape chained-list (Reptilian Recruiter): "gain control of
// [creature] [until end of turn,] untap it, and it gains haste". The untap
// rides on a chained-clause list within the same sentence rather than across
// a sentence boundary, so the pronoun pattern's `\.\s*` anchor misses. Narrow
// to "gain control + untap" template only.
const CHAINED_GAIN_CONTROL = /\bgain control of [^.]{0,60}?,\s*untap (?:it|that creature|them)\b/;

// 2026-06-01 audit Group 15 — self-trigger antecedent for "untap it"
// (Brightfield Mustang, Quintessential Katana, Interface Ace). "Whenever this
// creature <verb>, ..., untap it" restricts the bare "untap it" cleanly —
// the self-trigger preamble guarantees "it" refers to the host creature.
// Bare "untap it" without antecedent stays unmatched.
const SELF_TRIGGER_PRONOUN = /\bwhenever this creature (?:attacks|blocks|attacks or blocks|becomes tapped|becomes blocked|deals (?:combat )?damage)[^.]{0,80}?,\s*untap it\b/;

// v0.38.0 — Batch 10: ENTERS_TAPPED_PRONOUN. Amulet of Vigor: "whenever a
// permanent you control enters tapped, untap it". Scoped: requires a
// "when[ever] ... enters tapped" preamble within ~80 chars before the
// "untap (it|them)" target. Distinct from PRONOUN_PATTERN because the
// antecedent is an ETB-tapped trigger, not a "target X" / "X you control"
// noun phrase.
const ENTERS_TAPPED_PRONOUN = /\bwhen(?:ever)?\s+[^.]{0,80}?enters tapped[^.]{0,40}?,\s*untap (?:it|them)\b/;

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
      const m =
        after.match(PATTERN) ??
        after.match(PATTERN_SUBTYPE) ??
        after.match(EACH_OTHER_PATTERN) ??
        after.match(PRONOUN_PATTERN) ??
        after.match(TRIBAL_LIST_PRONOUN_PATTERN) ??
        after.match(CHAINED_GAIN_CONTROL) ??
        after.match(GAIN_CONTROL_PRONOUN) ??
        after.match(SELF_TRIGGER_PRONOUN) ??
        after.match(ENTERS_TAPPED_PRONOUN);
      return m ? { evidence: m[0] } : false;
    }
    const m =
      t.match(PATTERN) ??
      t.match(PATTERN_SUBTYPE) ??
      t.match(EACH_OTHER_PATTERN) ??
      t.match(PRONOUN_PATTERN) ??
      t.match(TRIBAL_LIST_PRONOUN_PATTERN) ??
      t.match(CHAINED_GAIN_CONTROL) ??
      t.match(GAIN_CONTROL_PRONOUN) ??
      t.match(SELF_TRIGGER_PRONOUN) ??
      t.match(ENTERS_TAPPED_PRONOUN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['untap'], proximity: ['creature', 'permanent', 'target', 'all'], window: 6 },
};
