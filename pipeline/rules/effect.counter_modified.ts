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
    if (m) return { evidence: m[0] };
    // "Enters [tapped] with [N] [type] counter(s) on it" — static ETB form
    // (Sleep-Cursed Faerie). Same axis as the active "put" verb: counters
    // are being placed on a permanent at ETB.
    const ettb = t.match(
      /\benters(?:\s+tapped)?\s+with\s+(?:a |an |\d+ |x |one |two |three |four |five |six |seven |eight |nine |ten )(?:\+1\/\+1 |-1\/-1 |[a-z][a-z'\-]+ )?counters?\b/,
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
    return player ? { evidence: player[0] } : false;
  },
};
