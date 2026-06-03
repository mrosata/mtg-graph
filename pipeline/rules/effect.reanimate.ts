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
  // v0.20.0 — Enduring cycle: optional "if it was a creature" interpolation
  // between "dies," and "return it" (Enduring Courage/Curiosity/Innocence/
  // Tenacity/Vitality). The bounded interpolation keeps the adjacency tight.
  // v0.22.0 — Unstoppable Slasher: "if it had no counters on it" interpolation.
  // The optional conditional slot was previously hard-coded to "if it was a
  // creature"; broaden to any short conditional clause.
  // 2026-06-01 audit Group 11 — Valkyrie's Call: "dies, return that card to
  // the battlefield...". Admit `that card` alongside `it`/`that creature`/
  // `them` in the pronoun alternation — same dies-trigger semantic with a
  // different anaphor noun.
  /\bdies,(?:\s+if [^,.]{1,40},)?\s+return (?:it|that creature|that card|them) to the battlefield/,
  // v0.20.0 — Come Back Wrong: anaphoric "if a creature card is put into
  // a graveyard this way, return it to the battlefield". The "this way"
  // (or "from the battlefield") anaphor binds back to a prior graveyard
  // -putting clause in the same effect.
  /\bput into a graveyard (?:this way|from the battlefield),\s+return (?:it|that creature|them)\s+to the battlefield/,
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
  // v0.20 — "put into graveyard this way" reanimation (Starfall Invocation:
  // "destroy all creatures. if the gift was promised, return a creature card
  // put into your graveyard this way to the battlefield"). The "this way"
  // back-references the wipe clause; the card is in graveyard at resolution
  // time, so the return-to-battlefield is reanimation.
  /\breturn (?:a |target )?creature card put into (?:your|a|each\s+player'?s) graveyard this way to the battlefield/,
  // v0.21.0 — dies-trigger with "under <X>'s control" destination (Meathook
  // Massacre II). The reanimation may be separated from the "dies" by a
  // "pay N life" intermediate sentence; anaphoric "return that card" binds
  // back. Destination is "under your/its owner's control" OR "to the
  // battlefield". The bounded period-bridge (0,200 then \. then 0,100)
  // mirrors the v0.18 anaphoric arm; this arm only differs in destination.
  /\bdies[^.]{0,200}?\.[^.]{0,100}?return (?:it|that card|that creature)\s+(?:to the battlefield|under (?:your|its owner'?s|their) control)\b/,
  // v0.21.0 — mill-trigger reanimation (Hedge Shredder): "one or more
  // [type] cards are put into <X>'s graveyard from <X>'s library, put them
  // onto the battlefield". The library→graveyard transition is mill;
  // the "put them onto the battlefield" right after is reanimation.
  /\bone or more (?:land |creature |artifact |enchantment |planeswalker )?cards?\s+(?:are\s+)?put into [\w']+? graveyard from [\w']+? library,[^.]{0,40}?put them onto the battlefield\b/,
  // 2026-06-01 audit Group 11 — Daretti, Rocketeer Engineer: "choose target
  // <type> card in <X>'s graveyard ... return the chosen card to the
  // battlefield". The "the chosen card" anaphor binds back to a "choose
  // target ... card in ... graveyard" antecedent across one or more
  // intermediate sentences. Bounded by 200 chars so the two halves stay in
  // tight scope. Filler admits periods so 1-2 intermediate sentences (cost
  // clauses like "you may sacrifice an artifact") can sit between.
  //
  // v0.33+ — Brilliance Unleashed: "choose target artifact card in your
  // graveyard. return it to the battlefield ...". Anaphor broadened from
  // "the chosen card" to "(?:it|the chosen card)" since "choose target
  // ... card" antecedent uniquely binds "it" to that card.
  /\bchoose target [^.]+? card in (?:your|a|an opponent's|target opponent's) graveyard\.[\s\S]{0,200}?return (?:it|the chosen card) to the battlefield/,
  // v0.33+ — Zuko's Conviction: "return ... from <X>'s graveyard to your
  // hand. ... (instead )?put that card (onto|to) the battlefield". The
  // grave-to-hand-then-battlefield modal shape uses "that card" anaphor
  // bound to the prior graveyard-source clause. Distinct from the existing
  // graveyard-anaphor arm (which uses "return that card"), this uses
  // "put that card".
  /\bfrom (?:your|a|an opponent's|any) graveyard[^.]{0,200}?\.[^.]{0,100}?(?:instead )?put that card (?:onto|to) the battlefield/,
  // v0.35.0 — Batch 2: mill-then-reanimate with anaphoric "from among them".
  // Vastlands Scavenger // Bind to Life: "Mill seven cards. Then put a
  // creature card from among them onto the battlefield". The "them" binds
  // to the just-milled cards (now in graveyard); same semantic as the
  // existing "from among the milled cards" arm with a pronoun anaphor.
  /\bmill\s+\S+\s+cards?\.\s*then\s+put\s+(?:a |an |one |any number of )?(?:[\w\-]+ ){0,3}?(?:permanent|creature|artifact|enchantment|planeswalker|card)s?\s+from among them onto the battlefield\b/,
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
