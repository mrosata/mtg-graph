// pipeline/rules/effect.deals_damage.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.deals_damage',
  axis: 'effect',
  label: 'Deals damage',
  description: 'Deals damage to a player, permanent, or planeswalker.',
  pairsWith: ['trigger.damage_dealt', 'trigger.life_changed'],
};

// Self-reference forms a card may use to refer to itself. Includes the
// name-substituted `__self__` token, plus "this <type>" phrasings — modern
// oracle templating ("this creature deals 1 damage to any target") and
// Rooms ("this Room deals damage equal to...") both use these. Other rules
// like trigger.self_etb already accept the same shape.
const SELF = '(?:__self__|this (?:room|creature|artifact|enchantment|land|permanent|saga|vehicle|equipment|planeswalker))';

// Three damage-action shapes:
//   1. literal amount: "X deals 2 damage"
//   2. variable amount: "X deals X damage" / "X deals N damage" where N is X
//   3. equal-to clause: "X deals damage equal to its power"
// All three are EFFECT shapes (the card actually deals damage). Trigger-on-
// damage phrasings ("whenever X deals damage") deliberately don't match —
// they describe a response to damage, not a damage-dealing effect.
//
// `IT` (granted-ability subject) is scoped via `(?<=: )` or `(?<=, )` positive
// lookbehind — the ": " is the activated-ability separator (Food Fight /
// Goblin Bombardment-style "{cost}, sacrifice X: it deals damage..."); the
// ", " covers modern ETB templating "When this <type> enters, it deals N
// damage" (Idol of the Deep King, Magmatic Galleon). Period-prefixed "it"
// ("create a 2/2 token. it deals 2 damage") is still excluded because the
// referent is a token, not the host.
// v0.20.0 — G13: admit `and ` lookbehind alongside `: ` and `, ` so
// chained-list antecedents like "remove those counters and it deals 20
// damage" (Cursed Recording, Vivi Ornitier) bind correctly. The Valley
// Flamecaller damage-replacement FP is suppressed by the G26 mask in the
// match function (no `and` precedes `it` in that card anyway).
// 2026-06-02 audit batch — gendered/plural anaphors: also admit `he|she|they`
// under the same lookbehind. Marvel cards (Electro, Morlun, Shocker)
// re-introduce the host with the pronoun matching the character's pronoun
// set ("when __self__ enters, he deals X damage"). Same antecedent
// semantics as `it`; the surrounding `(?<=: |, |and )` guard keeps
// post-period leaks out. The `(?<!\. )` post-period exclusion is preserved
// because the new alternatives share the same enclosing lookbehind.
const IT = '(?<=: |, |and )(?:it|he|she|they)';
const SUBJ = `(?:${SELF}|${IT})`;

// Multiplier-prefix slot: "twice", "thrice", or "N times" between `deals`
// and the amount (Torch the Witness — "deals twice X damage"). Optional so
// existing positives ("deals 2 damage", "deals X damage") still match.
const MULT = '(?:twice |thrice |\\d+ times )?';

// v0.35.0 — Batch 5: count-bearing arms accept `deal[s]?` (optional `s`)
// so multi-named legendaries whose `__SELF__` parses as a "X & Y" plural
// noun subject (Tokka & Rahzar, Terrible Twos — "__self__ deal 3 damage")
// still fire. The equal-to arm (pattern 3) keeps `deals` so trigger-form
// phrasings like "whenever __self__ deal damage equal to its power" do not
// accidentally match.
const PATTERNS = [
  new RegExp(`\\b${SUBJ} deal[s]? ${MULT}\\d+ (?:combat )?damage\\b`),
  new RegExp(`\\b${SUBJ} deal[s]? ${MULT}x (?:combat )?damage\\b`),
  // Optional `(?: to [^.]*?)?` accepts a target phrase between "damage" and
  // "equal to" — Food Fight phrasing "deals damage to any target equal to
  // 1 plus the number of...". Existing positives ("deals damage equal to its
  // power") still match because the inner group is optional. Keep `deals`
  // (singular) here — the equal-to arm has no numeric count, and broadening
  // to `deal[s]?` would FP on trigger-form "whenever __self__ deal damage
  // equal to its power".
  new RegExp(`\\b${SUBJ} deals (?:combat )?damage(?: to [^.]*?)? equal to\\b`),
  // v0.12.9: variable bound damage where the amount was bound earlier in the
  // ability ("...deals damage to that creature, __self__ deals that much
  // damage to each opponent"). Imodane the Pyrohammer is the canonical case.
  new RegExp(`\\b${SUBJ} deal[s]? that (?:much|many) (?:combat )?damage\\b`),
  // v0.23 — subjunctive "may have <SUBJ> deal N damage" (Requiem Monolith:
  // "may have this artifact deal 1 damage to it"; Kederekt Parasite has the
  // same frame). Verb is `deal` without the -s — same axis as the active
  // form. The MULT slot also admits multi-deal trickery if it surfaces later.
  new RegExp(`\\bmay have ${SUBJ} deal ${MULT}\\d+ (?:combat )?damage\\b`),
  new RegExp(`\\bmay have ${SUBJ} deal ${MULT}x (?:combat )?damage\\b`),
];

// v0.20.0 — G26: mask the damage-replacement frame "would deal damage ...
// it deals that much damage plus N instead" so the SUBJ patterns (and the
// IT lookbehind in particular) don't pick up Valley Flamecaller's
// replacement-effect "it deals that much damage" as a damage source.
const REPLACEMENT_MASK = /\bwould deal damage[^.]*?\bit deals that (?:much|many) damage plus [^.]+\binstead\b/g;

export const rule: Rule = {
  id: 'effect.deals_damage',
  axis: 'effect',
  match: (t) => {
    const masked = t.replace(REPLACEMENT_MASK, '');
    for (const re of PATTERNS) {
      const m = masked.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  // v0.14.6 — multi-word legendary names without comma/of/the separators
  // (e.g. "Zoyowa Lava-Tongue") don't get short-name self-substitution from
  // normalize.ts. The card's oracle uses the short legendary name ("Zoyowa
  // deals 3 damage to each opponent"), which the SUBJ pattern misses. The
  // matchCard branch uses the card's first name word as a self-ref subject.
  matchCard: (card, text) => {
    if (!card.name) return false;
    const firstWord = card.name.split(/\s+/)[0];
    if (!firstWord || firstWord.length < 4) return false;
    // Only fire when the full name didn't already become __SELF__ via the
    // single-segment path (i.e. multi-word name with no comma/of/the). If
    // text already contains __self__, skip — text-side path handles it.
    if (text.includes('__self__')) return false;
    const lower = firstWord.toLowerCase();
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // v0.35.0 — Batch 5: mirror PATTERNS `deal[s]?` broadening on the
    // count-bearing arms only. The equal-to arm keeps `deals` (singular).
    const dyn = [
      new RegExp(`\\b${escaped}\\s+deal[s]? ${MULT}\\d+ (?:combat )?damage\\b`),
      new RegExp(`\\b${escaped}\\s+deal[s]? ${MULT}x (?:combat )?damage\\b`),
      new RegExp(`\\b${escaped}\\s+deals (?:combat )?damage(?: to [^.]*?)? equal to\\b`),
      new RegExp(`\\b${escaped}\\s+deal[s]? that (?:much|many) (?:combat )?damage\\b`),
    ];
    for (const re of dyn) {
      const m = text.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
};
