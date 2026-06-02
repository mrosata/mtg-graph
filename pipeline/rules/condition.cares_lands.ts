// pipeline/rules/condition.cares_lands.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_lands',
  axis: 'condition',
  label: 'Cares about lands',
  description: 'Triggers, scales, or pays off on lands you control, land cards in graveyard, or manland-style land creatures.',
  pairsWith: ['effect.is_manland', 'effect.animate_land', 'effect.ramp_nonland', 'effect.play_extra_land'],
};

// Cares-about-lands phrasings: lands-you-control payoffs, lands-in-graveyard payoffs,
// land-count gates, and manland buffs ("land creatures"). Excludes tutor/destroy
// effects that just *mention* lands without caring about them as a count or class.
//
// v0.14.10 — "more/fewer lands than <you|opponent>" admits the catch-up gate
// frame (Discerning Financier: "if an opponent controls more lands than you").
// Same semantic as "for each land" — gates an effect on a land-count
// comparison. Covers 4 cards in Standard.
const PATTERN = new RegExp(
  '\\b(?:' +
    'lands? you control' +
    '|lands? (?:in|from) (?:your|a) graveyard' +
    '|land cards? (?:in|from) (?:your|a) graveyard' +
    // v0.21.0 — Hedge Shredder: land cards going to the graveyard from
    // a library / being revealed / being exiled from a graveyard is a
    // typed land-count payoff (mill-into-play, reveal-trigger). The
    // bare graveyard form already covers static gates; this admits the
    // dynamic frame. Excludes "reveal a land card" (tutor signature).
    '|land cards? (?:are )?(?:put into|reveal(?:ed)? (?:from|in)|exiled from) (?:your|a|target opponent\'s|each player\'s) graveyard' +
    '|each land you control' +
    '|for each land' +
    // v0.14.40 — admit "untapped|tapped|basic|snow" modifier between `more`
    // and `lands` (Dust Animus: "if you control five or more untapped
    // lands"). Same deck-state-gate semantic as the bare-noun form.
    '|(?:two|three|four|five|six|seven|eight|nine|ten|\\d+) or more (?:untapped |tapped |basic |snow )?lands' +
    '|(?:more|fewer) lands than (?:you|an opponent|target opponent)' +
    '|land creatures? you control' +
    '|number of lands' +
  ')\\b',
);

// Land-SUBTYPE-cares phrasings. The rule above keys on the literal word "land",
// which misses cards that gate only on a land subtype (Bat Colony's "a Cave you
// control", Spelunking's "if you put a Cave onto the battlefield"). These
// phrasings are still cares-about-lands semantically — the subtype IS a land.
//
// Restricted to a controlled-permanent frame ("<subtype> you control",
// "for each <subtype>", "a <subtype> [enters|you control]", "number of
// <subtype>") so we don't false-fire on mere mentions in flavor.
//
// v0.14.39 — added reversed-word-order "you control (a|an|two or more)
// <subtype>" branch (Cactarantula's "if you control a Desert" Desert-
// affinity cost reduction). OTJ Desert family is the canonical hit.
const LAND_SUBTYPE = '(?:plains|islands?|swamps?|mountains?|forests?|caves?|deserts?|gates?|towns?|planets?)';
const SUBTYPE_PATTERN = new RegExp(
  '\\b(?:' +
    `(?:a|an|another|target|each) ${LAND_SUBTYPE} you control` +
    `|${LAND_SUBTYPE} you control` +
    `|for each ${LAND_SUBTYPE}` +
    `|number of ${LAND_SUBTYPE}` +
    `|(?:two|three|four|five|six|seven|eight|nine|ten|\\d+) or more ${LAND_SUBTYPE}` +
    `|you control (?:a|an|the) ${LAND_SUBTYPE}` +
    `|you control (?:two|three|four|five|six|seven|eight|nine|ten|\\d+) or more ${LAND_SUBTYPE}` +
  ')\\b',
);

// v0.21.0 — Fear of Exposure: "as an additional cost to cast this spell,
// tap two untapped creatures and/or lands you control" mentions "lands you
// control" as a cost-clause, not a land-count payoff. Strip the additional-
// cost span before running PATTERNS.
const ADDITIONAL_COST_LANDS = /\bas an additional cost[^.]*?\btap\s+(?:two|three|\d+)\s+(?:untapped\s+)?creatures?\s+(?:and\/or\s+)?lands?\s+you\s+control\b/g;

// 2026-06-01 audit Group 14 — Verge land cycle: "activate only if you control
// a Plains or a Swamp" is an intrinsic activation gate on a dual-mana land,
// not a deck-side land-count payoff. Strip these gates before SUBTYPE_PATTERN
// runs so Verges don't false-fire cares_lands.
const VERGE_ACTIVATION_GATE = /\bactivate only if you control (?:a|an)\s+(?:plains|island|swamp|mountain|forest)\b(?:\s+or\s+(?:a|an)\s+(?:plains|island|swamp|mountain|forest)\b)?/g;

// FIX 9 (BR-4) — Wickerfolk Thresher: library-top reveal gated on land card
// classification ("look at the top card of your library. if it's a land card,
// you may put it onto the battlefield"). The card cares about lands because
// the effect's payoff varies based on whether the revealed card is a land.
// The 200-char window between the reveal and the "if it's a land card"
// branch keeps the arm bounded.
const LIBRARY_TOP_LAND_BRANCH =
  /\b(?:look at|reveal)\s+the\s+top\s+(?:\w+\s+)?cards?\s+of\s+(?:your|target\s+[^.]*?)\s+library\b[\s\S]{0,200}?\bif\s+(?:it'?s|that\s+card\s+is)\s+a\s+land\s+card\b/;

export const rule: Rule = {
  id: 'condition.cares_lands',
  axis: 'condition',
  match: (t) => {
    const stripped = t
      .replace(ADDITIONAL_COST_LANDS, '')
      .replace(VERGE_ACTIVATION_GATE, '');
    const m =
      stripped.match(PATTERN) ??
      stripped.match(SUBTYPE_PATTERN) ??
      stripped.match(LIBRARY_TOP_LAND_BRANCH);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['land'], proximity: ['you control', 'graveyard', 'each', 'or more'], window: 4 },
};
