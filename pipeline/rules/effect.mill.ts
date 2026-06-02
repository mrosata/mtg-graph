// pipeline/rules/effect.mill.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.mill',
  axis: 'effect',
  label: 'Mills cards',
  description: 'Puts cards from a library into a graveyard.',
  pairsWith: [],
};

// FIX 12 (BR-7) — Dread Summons: "each player mills x cards". Admit the
// literal `x` variable alongside digits and word numerals.
const NUM = '(?:\\d+|x|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twenty)';

export const rule: Rule = {
  id: 'effect.mill',
  axis: 'effect',
  match: (t) => {
    const re = new RegExp(
      `\\bmills? ${NUM} cards?\\b` +
      `|\\bputs? the top ${NUM} cards? of [\\w\\s]+? library into [\\w\\s]+? graveyard` +
      // Dig-and-discard pattern: after a top-N look the unselected portion
      // goes to graveyard. "[and] the rest into [a player's] graveyard."
      `|\\bthe rest into (?:your|their|each opponent's|target player's|an opponent's) graveyard` +
      // v0.14.4 — dig-2-keep-1 companion to "the rest into ... graveyard":
      // "look at top two, put one into your hand and the other into your graveyard"
      // (Faerie Snoop).
      `|\\bthe other into (?:your|their|its owner's) graveyard\\b` +
      // v0.27.x — reveal-and-cheat residue mill (Genesis Wave): the cards
      // revealed but not put onto the battlefield go to graveyard. Parallel
      // to the "the rest into ... graveyard" arm, but with a more explicit
      // residue clause naming the reveal-and-skip excess.
      `|\\bcards? revealed this way that weren't put onto the battlefield into (?:your|their|each opponent's|target player's|an opponent's) graveyard\\b` +
      // v0.14.1 — variable-N mill via "equal to". The Ancient One: "target
      // player mills cards equal to its mana value".
      `|\\bmills? cards? equal to\\b` +
      // 2026-06-01 audit batch — Jidoor, Aristocratic Capital: "target
      // opponent mills half their library, rounded down". Fractional /
      // proportional mill amount — same axis as numeric mill.
      `|\\bmills?\\s+(?:half|all|x)\\s+(?:of\\s+)?(?:their|its owner's|each player's)\\s+library\\b` +
      // v0.21.0 — Nashi, Searcher in the Dark: anaphoric "mills that many
      // cards" — count bound to a prior numeric clause (combat-damage amount,
      // etc.). Subject slot mirrors the existing mill arms.
      `|\\b(?:target\\s+player|you|each\\s+player)?\\s*mills?\\s+that\\s+many\\s+cards\\b` +
      // v0.20.0 — Cynical Loner: tutor-to-graveyard. "Search your library
      // for a card, put it into your graveyard, then shuffle". Bounded
      // fillers keep the match localized — the tutored card lands in
      // graveyard, functionally a self-mill.
      // 2026-06-01 audit batch — Lotuslight Dancers: multi-card tutor with
      // a SENTENCE BREAK between the search clause and the
      // put-into-graveyard clause. "Search your library for a black card,
      // a green card, and a blue card. Put those cards into your
      // graveyard, then shuffle." The prior `[^.]` filler couldn't span
      // the period. Use `[\\s\\S]` with a tight cap to admit one sentence
      // boundary; anchor on "those cards into your graveyard" (or "it" /
      // "them" / "that card") on the trailing side.
      `|\\bsearch [\\w\\s']+? library for (?:a|an|target)\\s+[\\s\\S]{0,160}?,?\\s+put (?:it|that card|them|those cards) into (?:your|their) graveyard\\b` +
      // FIX 12 (BR-7) — Consuming Aberration: reveal-until-land mill. Each
      // opponent reveals from library until a land, then puts those cards
      // into their graveyard. Net effect is graveyard fill — same axis as
      // numeric mill.
      `|\\breveals?\\s+cards?\\s+from the top of\\s+[\\w\\s']+?\\s+library\\s+until\\s+(?:they|you)\\s+reveal\\s+a\\s+land\\s+card[^.]{0,80}?puts?\\s+(?:them|those\\s+cards|that\\s+card)\\s+into\\s+[\\w\\s']+?\\s+graveyard`,
    );
    const m = t.match(re);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['mill', 'graveyard'], proximity: ['cards'], window: 8 },
};
