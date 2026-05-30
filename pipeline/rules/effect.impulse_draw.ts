// pipeline/rules/effect.impulse_draw.ts
//
// "Impulse draw" — exile the top card of your library, then permit playing it
// for a bounded duration ("this turn" / "until end of turn" / "until your next
// end step"). Mechanically distinct from `effect.exile_from_library` (the raw
// exile-the-top-card half) and from `effect.draws_or_discards` (hand draw).
// This tag captures the canonical "Light Up the Stage / Outpost Siege / Chandra"
// red-card-advantage axis.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.impulse_draw',
  axis: 'effect',
  label: 'Impulse draw',
  description: 'Exiles the top card of your library and lets you play it for a bounded duration. Strictly a superset of `effect.exile_from_library` (it always implies one) but adds the "play from exile" half — pairs with `condition.cares_exile_pile` and other exile-pile payoffs. Same-axis pair with `effect.exile_from_library` is excluded by the graph builder (effect↔effect not allowed); both tags fire on the same card and the impulse-draw tag carries the richer signal.',
  pairsWith: ['condition.cares_exile_pile'],
};

// Canonical phrasing has two parts joined by a period or sentence break:
//   "exile the top card[s] of your library." THEN "you may play it" / "play that
//   card" with an optional duration clause. Captured here as a single regex
//   spanning both halves with bounded filler.
//
// Multi-card pick variant: an intermediate "choose one of them." clause is
// allowed between the exile and play halves (e.g. Case of the Burning Masks).
const PATTERN = /\b(?:exile the top (?:\S+ )?cards? of (?:your|their) library|exile (?:\S+ ){0,2}cards? from the top of (?:your|their) library)\.(?:[^.]{0,60}\.)?[^.]{0,40}?(?:you may |they may |that player may )?play (?:it|that card|those cards|them)(?:[^.]{0,40}?(?:this turn|until (?:your |their |the )?(?:next end step|end of (?:their|your) next turn)|until end of turn))?/;

export const rule: Rule = {
  id: 'effect.impulse_draw',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile', 'play'], proximity: ['top', 'library', 'this turn'], window: 12 },
};
