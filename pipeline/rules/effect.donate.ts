// pipeline/rules/effect.donate.ts
//
// Donate axis — giving away your own permanents to an opponent. Distinct from
// `effect.control_change` which is the "steal" direction (Mind Control,
// Threats Undetected). Combo / chaos enabler in the Harmless Offering /
// Wishclaw Talisman / Humble Defector / Bazaar Trader family.
//
// effect.control_change already has a DONATION_SCRUB that suppresses these
// patterns from the steal axis, so the two rules cleanly partition the
// control-change space.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.donate',
  axis: 'effect',
  label: 'Donates a permanent',
  description:
    'Gives a permanent you control to an opponent. The Donate / Harmless Offering / Humble Defector family — distinct from `effect.control_change` (steal direction).',
  pairsWith: [],
  category: 'theme',
};

// Two canonical templates:
// (a) Direct: "<opponent-subject> gains control of <X>" — Harmless Offering,
//     Humble Defector, Wishclaw Talisman, Stiltzkin.
// (b) Have-form: "you may have target opponent gain control of <X>" — Iroh.
//     The subject is "you" but the *control change* is to the opponent.
const SUBJECT = '(?:target opponent|an opponent|each opponent|that opponent)';
const NOUN = '(?:permanent|creature|artifact|enchantment|planeswalker|land|this (?:creature|artifact|enchantment|land|permanent|planeswalker))';
const DIRECT = new RegExp(
  `\\b${SUBJECT} gains? control of (?:target |another target |a |an )?(?:[\\w\\-]+\\s+){0,3}${NOUN}\\b`,
);
const HAVE_FORM = new RegExp(
  `\\bhave ${SUBJECT} gain control of (?:target |another target |a |an )?(?:[\\w\\-]+\\s+){0,3}${NOUN}\\b`,
);

// "Whenever an opponent gains control of <X> from you" is a TRIGGER about
// donation (Zidane, Tantalus Thief), not a donation effect itself. Strip such
// trigger clauses before matching so the payoff-side doesn't FP as a producer.
const TRIGGER_SCRUB = /\b(?:when|whenever) (?:an? |target |each |that )?opponents? gains? control of [^.]+\./g;

// v0.30 Group 23 — Exchange control is bidirectional but includes the donate
// half (your permanent goes to an opponent). Trade the Helm.
// v0.35.0 Batch 26 — anchor on `you control` within the same clause so the
// rule requires a controller-to-opponent transfer. Kitsune ("exchange
// control of two other target creatures controlled by different players")
// swaps two opponent-controlled creatures and never touches anything you
// control — not a donation.
const EXCHANGE_CONTROL = /\bexchange control of [^.]{0,200}?\byou control\b/;

export const rule: Rule = {
  id: 'effect.donate',
  axis: 'effect',
  match: (t) => {
    const scrubbed = t.replace(TRIGGER_SCRUB, '');
    const m = scrubbed.match(DIRECT) ?? scrubbed.match(HAVE_FORM) ?? scrubbed.match(EXCHANGE_CONTROL);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['opponent', 'control'], proximity: ['gain', 'permanent', 'creature'], window: 6 },
};
