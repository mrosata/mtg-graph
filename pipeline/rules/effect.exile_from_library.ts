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
// v0.33+ — admit "a number of" (End-Blaze Epiphany).
const NUM = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twenty|x|that many|a number of)';
const LIBRARY_OWNER = '(?:your|target opponent\'s|target player\'s|their|each opponent\'s|each player\'s)';

export const rule: Rule = {
  id: 'effect.exile_from_library',
  axis: 'effect',
  match: (t) => {
    const re = new RegExp(
      // Frame A: "exile the top [N] cards? of <library>" — direct exile.
      // Number is optional ("exile the top card of your library").
      // v0.39.0 — 200-card audit Ship 12b — Arvinox, the Mind Flail:
      // "bottom" alternation alongside "top" (bottom-of-library exile).
      `\\bexile the (?:top|bottom) (?:${NUM} )?cards? of ${LIBRARY_OWNER} library\\b`
      // Frame B: "<player> exiles the top [N] cards? of <library>" — opponent-
      // performs-it templating (Ashiok −7, Memory Plunder, etc.).
      + `|\\b(?:target (?:player|opponent)|each opponent|each player) exiles the top (?:${NUM} )?cards? of ${LIBRARY_OWNER} library\\b`
      // v0.33+ — Frame B': "<player> exiles cards from the top of <library>"
      // (Dream Harvest). The "top N" / "top card" arm above misses this
      // shape because "cards" precedes "from the top of" rather than
      // following "the top".
      + `|\\b(?:target (?:player|opponent)|each opponent|each player) exiles (?:${NUM} )?cards? from the top of ${LIBRARY_OWNER} library\\b`
      // Frame C: "exile (that many|N|count-less) cards from the top of
      // <library>" — life-cost replacement and Embereth-style payoffs.
      // v0.20 — NUM made optional so "exile cards from the top of your
      // library until ..." (The Infamous Cruelclaw) matches.
      + `|\\bexile (?:${NUM} )?cards? from the top of ${LIBRARY_OWNER} library\\b`
      // v0.15 — Frame D: tutor-then-exile. "search your library for X cards
      // [...filter...], exile them" / "search your library for a card [...]
      // and exile it" (Omenpath Journey). The library is searched, matched
      // cards are exiled to enable a later play-from-exile payoff.
      // 2026-06-01 audit Group 13 — Ancient Vendetta: broaden the search
      // subject from "your library" to "(your|target <player>) library" so
      // a multi-zone search of TARGET OPPONENT's library still matches.
      + `|\\bsearch (?:your|target [^.]+?)\\s+library for [^.]{0,120}?(?:,\\s+exile (?:them|it|that card|those cards)|\\s+and exile (?:them|it|that card|those cards))\\b`
      // v0.18 — Frame E: look-then-exile "look at the top [N] cards of
      // <library>. you may exile (a|an|one|...) <type>? card from among
      // them" (Make Your Own Luck, The Key to the Vault). Two-clause shape
      // separated by a period; the exile is opt-in. NOTE: forbid `.`
      // and `,` in the filler so we can't span across an unrelated later
      // sentence's exile clause.
      + `|\\b(?:look at|reveal) (?:the top (?:${NUM} )?cards?|that many cards) (?:of |from the top of )${LIBRARY_OWNER} library\\.[^.]{0,80}?(?:you may )?exile (?:up to )?(?:a|an|one|two|three) (?:[\\w\\-]+\\s+){0,2}?card (?:of [\\w\\s]+? )?from among them\\b`
      // v0.18 — Frame F: variable-expression count. "exile cards equal to
      // <expr> from the top of <library>" (Rakdos, the Muscle). The count
      // is an arithmetic phrase rather than a literal NUM token.
      + `|\\bexile cards equal to [^.]{0,80}? from the top of ${LIBRARY_OWNER} library\\b`
      // v0.20.0 — Frame G: "exile all but the (top|bottom) N cards of
      // their/your library" (Doomsday Excruciator). The complement is
      // exiled; the small remainder stays in the library.
      + `|\\b(?:each player|you|target opponent|target player)\\s+exiles? all but the (?:bottom|top) (?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|x) cards? of (?:their|your|each opponent's) library\\b`
      // v0.30 Group 25 — Frame H: anaphoric look-then-exile (Gonti, Night
      // Minister). "looks at the top [N] card(s) of [<player>'s] library
      // ... exiles it/them". The exile is unconditional and the antecedent
      // is the "top N cards" referenced by "it"/"them"; distinct from
      // Frame E which requires "from among them".
      + `|\\blooks? at the top (?:${NUM} )?cards? of (?:target |that |each )?(?:opponent|player)'?s? library\\b[^.]{0,60}?\\bexiles? (?:it|them)\\b`,
    );
    const m = t.match(re);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['exile', 'library'], proximity: ['top', 'cards'], window: 8 },
};
