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
    const millFromAmong = t.match(
      /\bmills?\s+(?:\w+\s+)?cards?[^.]{0,80}?,?\s*(?:then\s+)?return\s+(?:up to\s+)?(?:\d+|one|two|three|four|five|x|any number of)\s+(?:[\w\-]+\s+)?cards?\s+from among them\s+to your hand\b/,
    );
    return millFromAmong ? { evidence: millFromAmong[0] } : false;
  },
  nearMiss: { anchors: ['graveyard', 'graveyards'], proximity: ['return', 'hand'], window: 8 },
};
