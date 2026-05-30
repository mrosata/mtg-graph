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
const PATTERN =
  /\bcast (?:[\w\-/']+\s+){1,12}?without paying (?:its|the|that spell's|their) mana costs?\b/;

export const rule: Rule = {
  id: 'effect.cast_for_free',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['without paying'], proximity: ['cast', 'mana cost'], window: 6 },
};
