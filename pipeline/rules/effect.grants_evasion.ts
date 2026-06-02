// pipeline/rules/effect.grants_evasion.ts
//
// The card grants flying / menace / intimidate to other creatures, either as a
// continuous static ability ("creatures you control have flying"), a temporary
// pump ("target creature gains flying until end of turn"), or by creating
// tokens that carry the keyword ("create a 1/1 white Spirit creature token
// with flying"). The intrinsic-keyword case is handled separately by the
// per-keyword `effect.has_flying` / `effect.has_menace` rules (which read
// card.keywords) — these replaced the umbrella `effect.has_evasion_intrinsic`
// retired in v0.14.0. So the patterns here intentionally require a granting
// verb/preposition and never match the bare keyword line at the top of a
// card.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.grants_evasion',
  axis: 'effect',
  label: 'Grants evasion',
  description: 'Gives flying, menace, or intimidate to other creatures or to tokens it creates.',
  pairsWith: ['condition.cares_evasion'],
};

const PATTERNS = [
  // "creatures you control have flying", "each creature has menace".
  // Negative lookbehind for self-conditional subjects ("this creature has
  // flying as long as …", "__self__ has menace while …") — those belong to
  // `effect.gains_keyword_self_conditional`, not the grants/anthem axis. The
  // self-subject pattern is bounded: "this <single-word-type> " or "__self__ ".
  /(?<!\bthis (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker) )(?<!\b__self__ )\b(?:have|has|gain|gains) (?:flying|menace|intimidate)\b/,
  // v0.30 Group 11c — chain through conjunction (Pyrewood Gearhulk: "gain
  // vigilance and menace until end of turn"). Allow up to three intermediate
  // non-evasion keywords joined by "and"/", and" before the evasion kw.
  /(?<!\bthis (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker) )(?<!\b__self__ )\b(?:have|has|gain|gains) [a-z]+(?:\s+strike)?(?:\s*,\s*[a-z]+(?:\s+strike)?){0,3}\s*,?\s+and\s+(?:flying|menace|intimidate)\b/,
  // "create a 1/1 white Spirit creature token with flying"
  /\btokens? with (?:flying|menace|intimidate)\b/,
  // "becomes a 4/4 flying creature".
  // v0.14.1: negative lookbehind for "this <type> becomes" / "__self__
  // becomes" — manland self-animation (Restless Anchorage / Vents) grants the
  // keyword to SELF, not to another creature; tagDef explicitly scopes to
  // "other creatures or to tokens it creates".
  /(?<!\bthis (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker) )(?<!\b__self__ )\bbecomes? a [^.]{0,40}\b(?:flying|menace|intimidate)\b/,
  // v0.14.2 — keyword-counter form. "Put a flying counter on it" grants flying
  // via the keyword-counter mechanism (DOM/SNC/MKM era).
  // Call a Surprise Witness: "put a flying counter on it".
  /\bput a (?:flying|menace|intimidate) counter\b/,
  // 2026-06-01 audit batch — multi-counter clause variant (Qarsi Revenant
  // family). "Put a flying counter, a deathtouch counter, and a lifelink
  // counter on target creature". Each grants_<kw> fires on its own kw
  // anywhere in the list.
  /\bput (?:a|an)\s+(?:[a-z][\w\- ]*?\s+counter\s*,\s+){1,4}(?:and\s+)?(?:a\s+|an\s+)?(?:flying|menace|intimidate)\s+counter\b/,
  // 2026-06-01 follow-up — Pattern D: "X counter and a <kw> counter" —
  // bare "and" conjunction (no comma). Kheru Goldkeeper: "Put two +1/+1
  // counters and a flying counter on target creature."
  /\bput\s+(?:a|an|one|two|three|four|five|six|seven|\d+|x)\s+(?:[\w\-+/]+\s+)?counters?\s+and\s+(?:a\s+|an\s+)?(?:flying|menace|intimidate)\s+counter\b/,
  // 2026-06-01 follow-up — Pattern D: "with a <kw> counter ... on it"
  // — reanimation/return-with frame, guarded by a preceding enters/
  // returns verb within ~120 chars to keep the "with" arm from leaking
  // onto unrelated frames. (Perennation doesn't involve evasion keywords
  // — it's hexproof + indestructible — but the analogous frame for the
  // evasion axis is included for symmetry; e.g. "return target creature
  // from your graveyard to the battlefield with a flying counter on it".)
  // Inner counter-list slot admits multi-counter with-clauses so each
  // kw in a list fires on its own.
  /\b(?:enters?|returns?)\b[^.]{0,120}?\bwith\s+(?:(?:a\s+|an\s+)?[a-z][\w\-+/ ]*?\s+counter\s*(?:,\s+|\s+and\s+)){0,4}(?:a\s+|an\s+)?(?:flying|menace|intimidate)\s+counter\b/,
];

// v0.14.6 — strip "as long as/while/if <gate>, it has/gains <kw>." self-
// anaphoric self-conditional clauses (Warden of the Inner Sky). The "it"
// antecedent is __SELF__ / "this creature" established in the gate clause;
// the grant belongs to effect.gains_keyword_self_conditional, not the
// anthem-style grants axis.
//
// v0.14.14 — broadened along two dimensions:
//   (a) Post-comma subject extended from bare "it" to also include explicit
//       self subjects ("this creature", "__self__") — Living Conundrum:
//       "as long as ..., this creature has flying and vigilance."
//   (b) Gate connectors extended to include "during" — Pompous Gadabout:
//       "during your turn, this creature has hexproof."
//   Subject-first self-conditional grants ("this creature has X as long as Y")
//   are intentionally NOT stripped (Grand Ball Guest, Gallant Pie-Wielder,
//   Didact Echo, __self__ has X as long as Y) — those remain grants_<kw>
//   matches per the existing design.
//
// v0.14.26 — added a second arm for TRIGGERED self-buffs (Rot Farm Mortipede):
// "when(ever) X, this creature gets +1/+0 and gains <kw> until end of turn."
// The triggered shape differs from the conditional in three ways: (1) gate is
// `when`/`whenever`, (2) verb after the self subject is `gets` (the +N/+N
// half) before `gains <kw>`, (3) clauses are statistically short. A safety
// lookahead `(?!other|creatures you control)` aborts the strip if the trailing
// clause contains an anthem subject — preserves the grants_<kw> match on the
// rare mixed self+anthem trigger templating.
const TRIGGERED_SELF_BUFF = new RegExp(
  String.raw`\b(?:when|whenever)\b[^.]*?,\s*(?:this\s+(?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)|__self__|it)\s+(?:has|have|gains?|gets?)\s+(?:(?!\bother\s+creatures?\b|\bcreatures?\s+you\s+control\b)[^.])*?\.`,
  'g',
);

function stripSelfAnaphor(t: string): string {
  return t
    .replace(
      // FIX 5 (FP-8) — verb alternation extended to include `gets?` so
      // "as long as ..., __self__ gets +1/+1 and has menace" (Elenda,
      // Saint of Dusk) matches the strip span. Mirrors the parallel
      // alternation already present in gains_keyword_self_conditional.ts.
      /\b(?:as long as|while|if|during)\b[^.]*?,\s*(?:this\s+(?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)|__self__|it)\s+(?:has|have|gains?|gets?)\s+[^.]*?\./g,
      '',
    )
    .replace(TRIGGERED_SELF_BUFF, '')
    // v0.20 — clone-frame self-anaphor (Mockingbird): "you may have this
    // creature enter as a copy of any creature ... except it's a Bird ...
    // and it has flying." The "it" is the freshly-entered self in clone
    // form; the keyword belongs to self, not to a separate creature, so
    // strip the entire clone clause before the grants-keyword regex sees
    // "it has flying".
    .replace(/\benter(?:s)? as a copy of [^.]*?\bit (?:has|have|gains?) [^.]*?\./g, '')
    // v0.20.0 — self-antecedent keyword-counter grant (Acrobatic
    // Cheerleader: "if this creature is tapped, put a flying counter on it").
    // The "it" antecedent is self (established by "this <type>" in the gate
    // clause), so the keyword belongs to self — not an other-creature grant.
    // Strip the entire self-conditional clause before the keyword-counter
    // pattern at PATTERNS[3] runs. Bare "put a flying counter on it"
    // without the gate clause is preserved.
    .replace(
      /\b(?:if|while|when|whenever|as long as)\s+[^.]*?\bthis\s+(?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)\b[^.]*?,\s*put a (?:flying|menace|intimidate) counter on it\b[^.]*\./g,
      '',
    )
    // v0.24 — DSK "Max speed —" ability-word self-conditional grant.
    // Gastal Raider: "Max speed — This creature gets +1/+1 and has menace."
    // The em-dash separator + verbose "gets X and has Y" chain isn't caught
    // by the as-long-as/while/if/during strip. The clause is bounded by
    // the next sentence period. Always self-scoped by Max speed's
    // mechanic-design so safe to strip the whole sentence.
    .replace(/\bmax speed\s*—\s*[^.]*?\./g, '')
    // 2026-06-01 follow-up — Sarkhan, Dragon Ascendant: "Until end of
    // turn, __self__ becomes a Dragon in addition to its other types
    // and gains flying." Self-conditional flying — the flying belongs
    // to SELF (the freshly-typed Dragon), not to other creatures.
    // Belongs in effect.gains_keyword_self_conditional. Per the v0.21
    // policy memo, stripping this becomes-and-gains-evasion clause from
    // grants_evasion is safe because the companion tag exists for
    // evasion only; non-evasion grantable keywords are unaffected
    // because they don't appear in the typical "becomes a [type] and
    // gains <kw>" templating.
    //
    // Inner type slot accepts stats (4/4), type words, hyphens, and "in
    // addition to its other types" prefixed clauses. Bounded at ~60
    // chars between "becomes a" and "and gains <evasion>" to keep the
    // strip from spanning unrelated sentences. Trailing tail is also
    // bounded so it doesn't gobble post-period anthem clauses.
    .replace(
      /\b(?:until end of turn,?\s+)?(?:this\s+(?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)|__self__)\s+becomes\s+a\s+[\w\-+/ ]{1,60}?\s+and\s+gains?\s+(?:flying|menace|intimidate)\b[^.]*\./g,
      '',
    );
}

export const rule: Rule = {
  id: 'effect.grants_evasion',
  axis: 'effect',
  match: (t) => {
    const text = stripSelfAnaphor(t);
    for (const re of PATTERNS) {
      const m = text.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['have', 'gain', 'gains', 'with'], proximity: ['flying', 'menace', 'intimidate'], window: 4 },
};
