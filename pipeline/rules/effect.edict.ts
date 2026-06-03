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
// FIX 18 (BR-13) — Desecration Demon: "any opponent may sacrifice ...".
// Add `any opponent` to the subject alternation alongside `each` / `target`.
// v0.35.0 — Batch 34: extend the object noun alternation to include typed
// permanents (artifact, enchantment, planeswalker, land). Lorehold Charm
// ("Each opponent sacrifices a nontoken artifact of their choice") and
// related opponent-edict-with-typed-permanent frames now fire on this
// axis. The companion typed-sacrifice rules (effect.sacrifice_artifact,
// etc.) intentionally suppress opponent-edict frames via their
// NEGATIVE_EDICT strips — edict owns this routing.
const PATTERN =
  /\b(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player|any\s+opponent)\s+(?:may\s+(?:[^.]{0,40}?\s+or\s+)?)?sacrifices?\s+(?:a\s+|an\s+|two\s+|three\s+|x\s+|that\s+many\s+|half\s+(?:the\s+)?(?:non-?\w+\s+)?)?(?:[\w\-,]+\s+){0,4}?(?:creature|permanent|artifact|enchantment|planeswalker|land)s?\b/;

// v0.20 — "unless <opponent> sacrifices" punisher-edict (Rottenmouth Viper:
// "each opponent loses 4 life unless that player sacrifices a nonland
// permanent ..."). The opponent's choice gates a sacrifice on a tax — same
// opponent-side sacrifice semantic as classic edicts. The opponent subject
// appears BEFORE the `unless` clause, and the `unless they/that player`
// re-introduces the sacrifice obligation. Allows an optional `<X> or` arm
// (Rottenmouth: "sacrifices ... or discards a card").
const UNLESS_PATTERN =
  /\b(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player)\b[^.]{0,80}?\bunless\s+(?:they|that\s+player|he\s+or\s+she)\s+(?:[^.]{0,40}?\s+or\s+)?sacrifices?\s+(?:a\s+|an\s+|two\s+|three\s+|x\s+|that\s+many\s+|half\s+(?:the\s+)?(?:non-?\w+\s+)?)?(?:[\w\-,]+\s+){0,4}?(?:creature|permanent)s?\b/;

// v0.22.0 — Vile Mutilator: chained "each opponent sacrifices X, then
// sacrifices Y" where X is non-creature/permanent (e.g. enchantment) and Y is
// the creature/permanent. The first clause's noun is irrelevant; the second
// clause re-introduces the opponent's forced sacrifice with the creature
// /permanent noun anchor.
const CHAINED_PATTERN =
  /\b(?:target\s+opponent|each\s+opponent|each\s+player|target\s+player)\s+sacrifices?\s+(?:a\s+|an\s+)?[\w\-]+(?:\s+[\w\-]+){0,5}?,\s+then\s+sacrifices?\s+(?:a\s+|an\s+)?(?:[\w\-,]+\s+){0,4}?(?:creature|permanent)s?\b/;

export const rule: Rule = {
  id: 'effect.edict',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(UNLESS_PATTERN) ?? t.match(CHAINED_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['sacrifice'], proximity: ['opponent', 'player', 'each', 'target'], window: 6 },
};
