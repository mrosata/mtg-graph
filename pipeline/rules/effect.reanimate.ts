// pipeline/rules/effect.reanimate.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.reanimate',
  axis: 'effect',
  label: 'Reanimates from graveyard',
  description: 'Returns a card from a graveyard to the battlefield.',
  pairsWith: ['trigger.another_creature_etb', 'trigger.creature_leaves_graveyard'],
};

// Reanimation regex families (v0.12.9):
//   1. Canonical "return/put .* card .* from a graveyard to/onto the battlefield".
//   2. Modal reanimation following a return-to-hand clause — "you may put one
//      of those cards … onto the battlefield instead of putting it into your
//      hand" (Back for Seconds). The "those cards" antecedent is the prior
//      "from your graveyard" clause; the second clause itself doesn't mention
//      graveyard but is still a reanimation effect.
//   3. Mill-then-recur — "put a creature card from among the (milled|exiled)
//      cards onto the battlefield" (Bramble Familiar // Fetch Quest). Cards
//      are in graveyard immediately after the mill.
//   4. Granted dies-then-reanimate triggers — "when this creature dies, return
//      it to the battlefield ..." (Not Dead After All grants this to a target
//      creature). The "it" antecedent is the creature just put into graveyard
//      by the dies trigger.
const PATTERNS = [
  /(?:returns?|puts?) [^.]*?cards?[^.]*?(?:from|that w[ae]s? in)[^.]*?graveyards?[^.]*?(?:to|onto) (?:the )?battlefield/,
  // Modal "put .. those cards .. onto the battlefield instead of putting it
  // into your hand" — bounded reachable from "graveyard" earlier in the text.
  /(?:from (?:your|a|an opponent's|any) graveyard|graveyards?)[^.]*?\bput[^.]*?(?:those|one of those|the chosen) cards?[^.]*?(?:to|onto) (?:the )?battlefield/,
  /\bput (?:one of those|those|the) cards?[^.]*?(?:to|onto) (?:the )?battlefield (?:instead of putting (?:it|them) into (?:your|their|its owner's) hand|tapped|under)/,
  // Mill-then-recur — "from among the (milled|exiled) cards onto the
  // battlefield". Bounded by 80 chars between "card" and "from among".
  /\bputs? [^.]*?cards?[^.]{0,80}?from among (?:the|those) (?:milled|exiled) cards[^.]*?(?:to|onto) (?:the )?battlefield/,
  // Granted dies → return-it-to-battlefield triggers (Not Dead After All).
  // The "dies" → "return it to the battlefield" pair is sufficient signal.
  /\bdies, return (?:it|that creature|them) to the battlefield/,
  // v0.14.1 — reversed-clause order. Squirming Emergence: "return to the
  // battlefield target ... card in your graveyard". The "to battlefield"
  // appears BEFORE the "from/in graveyard" mention.
  /(?:returns?|puts?) (?:to|onto) (?:the )?battlefield [^.]*?cards?[^.]*?(?:from|in) (?:a |your |any |an opponent's )?graveyards?/,
  // v0.14.x — search-graveyard-as-source (Agency Outfitter and similar).
  // "Search your graveyard[, hand and/or library]" or multi-zone searches that
  // include "graveyard" before "for", followed by a "put ... onto the
  // battlefield" clause. Graveyard must be present in the zone list; searching
  // only library/hand is a tutor, not reanimation.
  /\bsearch your (?:[^.]{0,60}?\bgraveyard\b[^.]{0,60}?) for [^.]*?and put (?:it|them|that card|those cards) onto the battlefield/,
  // v0.18 — anaphoric "return that card to the battlefield" after a
  // graveyard-source or dies-trigger antecedent across a sentence
  // boundary (Shepherd of the Clouds, Vraska, the Silencer). The
  // antecedent ("from <X>'s graveyard ..." or "<creature> dies") appears
  // in an earlier sentence; the reanimation clause refers back via
  // "that card". Bounded filler so the two halves stay within a tight
  // window — guards against unrelated battlefield-return triggers later
  // in the same card.
  /(?:from (?:your|a|an opponent's|any) graveyard|graveyards?|\bdies)[^.]{0,200}?\.[^.]{0,100}?return that card[^.]{0,40}?(?:to|onto) (?:the )?battlefield/,
];

export const rule: Rule = {
  id: 'effect.reanimate',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['graveyard', 'graveyards'], proximity: ['return', 'battlefield'], window: 8 },
};
