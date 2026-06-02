import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.return_from_graveyard_to_hand',
  axis: 'effect',
  label: 'Returns card from graveyard to hand',
  description: 'Returns a card from a graveyard to its owner\'s hand (recursion, distinct from reanimation to battlefield).',
  pairsWith: ['condition.cares_graveyard'],
};

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
    return putFromAmongMilled ? { evidence: putFromAmongMilled[0] } : false;
  },
  nearMiss: { anchors: ['graveyard', 'graveyards'], proximity: ['return', 'hand'], window: 8 },
};
