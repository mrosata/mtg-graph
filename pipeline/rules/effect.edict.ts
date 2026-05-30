// pipeline/rules/effect.edict.ts
//
// Edict — forces an opponent (or "each player", which is functionally the
// opponent-side compulsion when paired with low-cost expendable creatures) to
// sacrifice a creature or permanent. The Diabolic Edict / Innocent Blood /
// Cruel Edict / Gix's Command family. Distinct from `effect.sacrifice_creature`
// because the pairing semantics differ — edicts pair with opponent-side
// strategies (token fodder, tribal hate) while controller-side sacrifice
// pairs with the controller's own dies / leaves-battlefield triggers.
//
// Note: on symmetric "each player sacrifices ..." cards, BOTH this tag and
// effect.sacrifice_creature fire. That's correct — the controller does also
// sacrifice, but the edict semantic is independently present.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.edict',
  axis: 'effect',
  label: 'Edict (forces opponent to sacrifice)',
  description:
    'Forces an opponent (or each player) to sacrifice a creature or permanent — Diabolic Edict / Innocent Blood family. Pairs with opponent-side dies triggers.',
  pairsWith: ['trigger.creature_dies'],
};

// Subject must be opponent-scoped: "target opponent", "each opponent", "each
// player", "target player". Object must be a creature, permanent, or
// permanent-with-qualifier (nontoken / nonland). The capped filler accepts
// "two", "X", "a nontoken", etc.
// v0.14.6 — broadened to accept the punisher-edict template (Zoyowa Lava-
// Tongue, Rack/Wrench-family): "each opponent may <X> or sacrifice ...". The
// opponent gets to pick the lesser evil, but they're still being forced to
// sacrifice if they don't take option X — pairs the same as classic edicts.
// v0.14.23 — split the optional "may" arm so it accepts both shapes:
//   (a) bare "may sacrifice N ..." with the binary choice expressed as a
//       trailing "if they don't, …" clause (Rakdos, Patron of Chaos).
//   (b) "may <X> or sacrifice ..." with an explicit `or` arm (Zoyowa-style).
// Also extended the noun-qualifier filler to admit commas so "nonland,
// nontoken permanents" parses as a single qualifier list.
const PATTERN =
  /\b(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player)\s+(?:may\s+(?:[^.]{0,40}?\s+or\s+)?)?sacrifices?\s+(?:a\s+|an\s+|two\s+|three\s+|x\s+|that\s+many\s+|half\s+(?:the\s+)?(?:non-?\w+\s+)?)?(?:[\w\-,]+\s+){0,4}?(?:creature|permanent)s?\b/;

export const rule: Rule = {
  id: 'effect.edict',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['opponent', 'player', 'each', 'target'], window: 6 },
};
