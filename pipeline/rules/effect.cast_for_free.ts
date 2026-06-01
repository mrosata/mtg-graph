// pipeline/rules/effect.cast_for_free.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cast_for_free',
  axis: 'effect',
  label: 'Casts a spell without paying its mana cost',
  description: 'Casts an exiled or revealed card without paying its mana cost. Beseech the Mirror / cascade-adjacent / free-spell payoffs.',
  pairsWith: ['condition.cares_high_mana_value'],
};

// "cast [the/that/this/a] [exiled/revealed] card [from <zone>] without paying
// its mana cost" — the free-cast family (Beseech the Mirror, Cosmic
// Intervention, cascade-adjacent, Flotsam // Jetsam graveyard-source).
//
// v0.14.7 — filler now admits apostrophes (`'`) for `each opponent's` /
// `target opponent's` zone-source phrasings; filler ceiling raised 6 → 9 to
// span "from each opponent's graveyard" (6 tokens) plus a couple of leading
// adjective tokens.
//
// v0.14.15 — plural framing: "may cast any number of ... spells ... without
// paying their mana costs" (Kylox, Visionary Inventor). Added `their` to the
// determiner alt and `costs?` for the plural noun. Bumped filler ceiling
// 9 → 12 to span "any number of instant and/or sorcery spells from among
// the exiled cards" (~12 tokens).
//
// v0.19 — filler ceiling bumped 12 → 16 to admit graveyard-source casts with
// an interposed "with mana value N or less" qualifier (Daring Waverider:
// "cast target instant or sorcery card with mana value 4 or less from your
// graveyard without paying its mana cost" — 14 word tokens between "cast"
// and "without paying").
// v0.20 — admit "rather than paying" alt-cost variant (The Infamous
// Cruelclaw: "you may cast that card by discarding a card rather than paying
// its mana cost"). The alt-cost is functionally a free cast in graph terms —
// the mana cost is bypassed.
const PATTERN =
  /\bcast (?:[\w\-/']+\s+){1,24}?(?:without|rather than) paying (?:its|the|that spell's|their) mana costs?\b/;

// v0.20.0 — Charred Foyer // Warped Space: "you may pay {0} rather than pay
// the mana cost for a spell you cast from exile". The {0} alt-cost is the
// cast-for-free signal; the existing PATTERN required the literal "cast" verb
// before the filler, but here the cast verb comes AFTER ("a spell you cast").
const PAY_ZERO_RATHER_THAN = /\bpay \{0\}\s+rather than pay (?:its|the) mana cost\b/;

export const rule: Rule = {
  id: 'effect.cast_for_free',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PAY_ZERO_RATHER_THAN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['without paying'], proximity: ['cast', 'mana cost'], window: 6 },
};
