// pipeline/rules/effect.counter_modified.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.counter_modified',
  axis: 'effect',
  label: 'Adds or removes counters',
  description: 'Places or removes counters.',
  pairsWith: ['trigger.counter_changed'],
};

// v0.33+ — observer-frame leak (Lasting Tarfire): "if you put a counter
// on a creature this turn" is a CONDITIONAL OBSERVATION of a counter
// event (trigger.counter_changed axis), not an imperative counter-placement
// effect. Reject when the matched verb-clause is preceded by an
// `if <player> <verb>` opener.
const OBSERVER_PREFIX = /\bif\s+(?:you|target player|each opponent|a player)\s+$/;

export const rule: Rule = {
  id: 'effect.counter_modified',
  axis: 'effect',
  match: (t) => {
    // Quantifier slot: articles, numerics (1, 2, …), x, word-numbers
    // (one through ten), and the "a/any number of"/"that many" framings.
    // Counter-type slot: +1/+1, -1/-1, or any single-word named counter type
    // (stun, charge, loyalty, time, ice, lore, fade, age, blood, etc.).
    // Both slots optional so the bare "put a counter on…" still matches.
    // `distributes?` added to the verb slot for "distribute N +1/+1 counters
    // among ..." (Picnic Ruiner — Stolen Goodies, Pridemalkin, etc.). Same
    // counter-placement axis as "put" — the variable allocation just means the
    // caster picks the recipients.
    const m = t.match(
      /\b(?:puts?|places?|removes?|distributes?) (?:(?:a |an |\d+ |x |that many |a number of |any number of |one |two |three |four |five |six |seven |eight |nine |ten )(?:additional |another )?)?(?:\+1\/\+1 |-1\/-1 |[a-z][a-z'\-]+ )?counters?\b/,
    );
    if (m && m.index !== undefined) {
      // v0.33+ — reject observer-frame "if <player> <verb> ..." (Lasting
      // Tarfire). Examine the 30 chars preceding the match.
      const before = t.slice(Math.max(0, m.index - 30), m.index);
      if (!OBSERVER_PREFIX.test(before)) return { evidence: m[0] };
    }
    // "Enters [tapped] with [N] [type] counter(s) on it" — static ETB form
    // (Sleep-Cursed Faerie). Same axis as the active "put" verb: counters
    // are being placed on a permanent at ETB.
    // v0.30 Group 29 — admit "additional"/"another" modifier between the
    // quantifier and the counter-type slot (Thunderous Velocipede); the
    // sibling "put" arm at line 27 already has the same slot.
    const ettb = t.match(
      /\benters(?:\s+tapped)?\s+with\s+(?:(?:a |an |\d+ |x |one |two |three |four |five |six |seven |eight |nine |ten )(?:additional |another )?|another )(?:\+1\/\+1 |-1\/-1 |[a-z][a-z'\-]+ )?counters?\b/,
    );
    if (ettb) return { evidence: ettb[0] };
    // v0.14.18 — player-counter placement uses "gets" verb instead of "puts"
    // (Persuasive Interrogators, Fynn the Fangbearer, Virulent Silencer for
    // poison; experience/energy/rad/ki counters follow the same shape). The
    // subject is restricted to opponent/player to avoid leaking on the
    // "creature gets <stat>" anthem frame, and a counter-type word is
    // required directly before "counter(s)" to avoid leaking on "<player>
    // gets a treasure/clue/emblem" frames.
    const player = t.match(
      /\b(?:(?:each |target |that |a |another |the )?(?:opponent|player)s?|you) gets? (?:a |an |\d+ |x |one |two |three |four |five |six |seven |eight |nine |ten )?(?:additional |another )?[a-z][a-z'\-]+ counters?\b/,
    );
    if (player) return { evidence: player[0] };
    // v0.20 — return-to-battlefield-with-counter (Parting Gust, Salvation Swan,
    // Scavenger's Talent, Season of the Burrow): "return ... to the battlefield
    // ... with a +1/+1 counter on it". Functionally equivalent to placing a
    // counter; the existing "put/enters with" arms miss because the verb is
    // "return" and the "with <counter>" clause is split from the verb by a
    // creature reference + battlefield clause.
    const returnWithCounter = t.match(
      /\breturn(?:s)?\s+[^.]{0,80}?\bto the battlefield[^.]{0,60}?\bwith\s+(?:a |an |\d+ |x |one |two |three )?(?:\+1\/\+1 |-1\/-1 |[a-z][a-z\-']+ )?counters?\b/,
    );
    if (returnWithCounter) return { evidence: returnWithCounter[0] };
    // v0.21.0 — Ghost Vacuum / Meathook Massacre II: "put/return ... (?:to the
    // battlefield | under your control | under its owner's control) ... with
    // <type> counter". Relaxes the requirement that "to the battlefield" must
    // precede the counter — the "under <X> control" location phrase is
    // equivalent. Counter type required (single-word, prevents anthem leaks).
    const putReturnWithCounter = t.match(
      /\b(?:put|return)(?:s)?\s+[^.]{0,80}?(?:to the battlefield|under (?:your|its owner'?s|their) control)[^.]{0,80}?\bwith\s+(?:a |an |\d+ |x |one |two |three )?[a-z][a-z\-']+\s+counters?\b/,
    );
    if (putReturnWithCounter) return { evidence: putReturnWithCounter[0] };
    // v0.35.0 — Batch 13: move-counter frame. Tester of the Tangential
    // ("move X +1/+1 counters from this creature onto another target
    // creature"). Both source-side removal and target-side addition imply
    // counter modification — fits the broader counter_modified axis.
    // The companion arm on effect.plus_one_counter handles the +1/+1
    // specific addition.
    const moveCounter = t.match(
      /\bmove\s+(?:\d+|x|one|two|three|four|five)\s+\+1\/\+1 counters?\s+from\s+[^.]{0,40}?\s+onto\b/,
    );
    return moveCounter ? { evidence: moveCounter[0] } : false;
  },
};
