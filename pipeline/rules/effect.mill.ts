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

const NUM = '(?:\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twenty)';

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
      // v0.14.1 — variable-N mill via "equal to". The Ancient One: "target
      // player mills cards equal to its mana value".
      `|\\bmills? cards? equal to\\b` +
      // v0.21.0 — Nashi, Searcher in the Dark: anaphoric "mills that many
      // cards" — count bound to a prior numeric clause (combat-damage amount,
      // etc.). Subject slot mirrors the existing mill arms.
      `|\\b(?:target\\s+player|you|each\\s+player)?\\s*mills?\\s+that\\s+many\\s+cards\\b` +
      // v0.20.0 — Cynical Loner: tutor-to-graveyard. "Search your library
      // for a card, put it into your graveyard, then shuffle". Bounded
      // fillers keep the match localized — the tutored card lands in
      // graveyard, functionally a self-mill.
      `|\\bsearch [\\w\\s']+? library for (?:a|an|target)\\s+(?:[^.]{0,60}?\\s+)?cards?[^.]{0,60}?,?\\s+put (?:it|that card|them|those cards) into (?:your|their) graveyard\\b`,
    );
    const m = t.match(re);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['mill', 'graveyard'], proximity: ['cards'], window: 8 },
};
