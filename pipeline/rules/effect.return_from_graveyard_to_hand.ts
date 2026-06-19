import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.return_from_graveyard_to_hand',
  axis: 'effect',
  label: 'Returns card from graveyard to hand',
  description: 'Returns a card from a graveyard to its owner\'s hand (recursion, distinct from reanimation to battlefield).',
  pairsWith: ['condition.cares_graveyard'],
};

// v0.43.0 — Ares: "whenever a creature dies, return that card to its owner's
// hand". The anaphoric "that card" binds to the creature that just died
// (now in graveyard). Bounded to avoid FPs on reanimate-to-battlefield arms.
const DIES_RETURN_TO_HAND =
  /\bdies(?:[^.]{0,25})?,\s*return (?:that card|it|them) to (?:its owner'?s|your) hand\b/;

// v0.43.0 — Night Nurse: "target permanent card in your graveyard. Return it
// to your hand." Two-sentence graveyard-to-hand recursion. Bounded windows
// prevent spanning unrelated abilities.
const TWO_SENTENCE_RETURN =
  /\btarget (?:[\w\s]+\s+)?card[^.]{0,60}?in (?:your|a|an opponent'?s) graveyard\b[^.]{0,80}?\.\s+return it to (?:its owner'?s|your) hand\b/;

// v0.47.0 — Meren of Clan Nel Toth: "choose target creature card in your
// graveyard. if ... return it to the battlefield. otherwise, put it into
// your hand." The "otherwise" clause is the graveyard-to-hand recursion
// arm; the antecedent graveyard source is in the opening clause.
const OTHERWISE_TO_HAND =
  /\btarget [^.]+? card[^.]{0,100}?in (?:your|a|an opponent'?s) graveyard[\s\S]{0,300}?\botherwise,?\s+put (?:it|them|that card) into (?:your|its owner'?s) hand\b/;

export const rule: Rule = {
  id: 'effect.return_from_graveyard_to_hand',
  axis: 'effect',
  match: (t) => {
    // Optional `(?:[^.]*? )?` before `from|that was in` allows modifier
    // clauses between the noun and the graveyard locator — e.g. Edgewall Inn
    // "return target card that has an Adventure from your graveyard".
    const m = t.match(
      /returns? [^.]*?cards? (?:[^.]*? )?(?:from|that w[ae]s? in)[^.]*?graveyards?[^.]*?to [\w'\s]*? hand/,
    );
    if (m) return { evidence: m[0] };
    // v0.21.0 — Greenhouse // Rickety Gazebo: "mill <N> cards, then return
    // <count> [type] cards from among them to your hand". The mill creates
    // the graveyard contents; "from among them" anaphorically refers to those
    // milled cards — semantically a graveyard-to-hand recursion.
    // v0.34 — 400-card audit batch (HIGH-20) — Midnight Tilling: admit
    // optional "you may" between "then" and "return", and `a`/`an` singular
    // indefinite counts (in addition to one/two/three/.../x/any number of).
    const millFromAmong = t.match(
      /\bmills?\s+(?:\w+\s+)?cards?[^.]{0,80}?,?\s*(?:then\s+)?(?:you may\s+)?return\s+(?:up to\s+)?(?:a |an |\d+|one|two|three|four|five|x|any number of)\s*(?:[\w\-]+\s+)?cards?\s+from among them\s+to your hand\b/,
    );
    if (millFromAmong) return { evidence: millFromAmong[0] };
    // v0.30 Group 30 — Dredger's Insight family: "put <Q> [type] card from
    // among the milled cards into your hand" — anaphoric reference to a
    // milled subset. 11 cards in Standard use this frame. Distinct from the
    // sibling "from among the milled cards onto the battlefield" shape,
    // which is reanimation (effect.reanimate territory).
    const putFromAmongMilled = t.match(
      /\bput\s+(?:a |an |up to [\w\-]+ |any number of )?[^.]{0,40}?cards?\s+from among the (?:milled cards|cards milled this way)\s+into your hand\b/,
    );
    if (putFromAmongMilled) return { evidence: putFromAmongMilled[0] };
    // v0.43.0 — dies-trigger anaphoric return to hand (Ares shape).
    const diesReturn = t.match(DIES_RETURN_TO_HAND);
    if (diesReturn) return { evidence: diesReturn[0] };
    // v0.43.0 — two-sentence graveyard-to-hand (Night Nurse shape).
    const twoSentence = t.match(TWO_SENTENCE_RETURN);
    if (twoSentence) return { evidence: twoSentence[0] };
    // v0.47.0 — anaphoric "otherwise, put it into your hand" after a
    // graveyard-target antecedent (Meren of Clan Nel Toth).
    const otherwiseToHand = t.match(OTHERWISE_TO_HAND);
    return otherwiseToHand ? { evidence: otherwiseToHand[0] } : false;
  },
  nearMiss: { anchors: ['graveyard', 'graveyards'], proximity: ['return', 'hand'], window: 8 },
};
