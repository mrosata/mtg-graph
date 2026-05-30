// pipeline/rules/effect.exile_from_library.ts
//
// "Mill-but-to-exile" family — pushes cards from a library into the exile zone
// rather than the graveyard. Distinct from `effect.mill` (graveyard) and
// `effect.exile_from_graveyard` (different source zone). The exile pile is a
// scoring resource for cards like Ashiok / Quintorius / Light Up the Stage
// archetypes, so we pair this against `condition.cares_exile_pile`.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_from_library',
  axis: 'effect',
  label: 'Exiles cards from library',
  description: 'Moves cards from a library to the exile zone (not the graveyard). Distinct from mill (graveyard) and from exile_from_graveyard / exile_from_battlefield.',
  pairsWith: ['condition.cares_exile_pile'],
};

// NUM matches an explicit count token. Optional in Frame A ("exile the top
// card" = singular, no number).
const NUM = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|x|that many)';
const LIBRARY_OWNER = '(?:your|target opponent\'s|target player\'s|their|each opponent\'s|each player\'s)';

export const rule: Rule = {
  id: 'effect.exile_from_library',
  axis: 'effect',
  match: (t) => {
    const re = new RegExp(
      // Frame A: "exile the top [N] cards? of <library>" — direct exile.
      // Number is optional ("exile the top card of your library").
      `\\bexile the top (?:${NUM} )?cards? of ${LIBRARY_OWNER} library\\b`
      // Frame B: "<player> exiles the top [N] cards? of <library>" — opponent-
      // performs-it templating (Ashiok −7, Memory Plunder, etc.).
      + `|\\b(?:target (?:player|opponent)|each opponent|each player) exiles the top (?:${NUM} )?cards? of ${LIBRARY_OWNER} library\\b`
      // Frame C: "exile (that many|N) cards from the top of <library>" —
      // life-cost replacement and Embereth-style payoffs.
      + `|\\bexile ${NUM} cards? from the top of ${LIBRARY_OWNER} library\\b`,
    );
    const m = t.match(re);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile', 'library'], proximity: ['top', 'cards'], window: 8 },
};
