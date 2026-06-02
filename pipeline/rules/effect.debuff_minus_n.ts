// pipeline/rules/effect.debuff_minus_n.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.debuff_minus_n',
  axis: 'effect',
  label: 'Applies a -N/-N debuff',
  description:
    'Gives a creature -N/-N until end of turn (can kill via toughness ≤ 0).',
  pairsWith: ['trigger.creature_dies'],
};

// "-N/-N" where at least one side is a real negative (so it's a debuff).
// Three alternatives:
//   (1) "-0/-[1-9]N": toughness-only debuff (Overkill: -0/-9999). Power
//       unchanged, toughness drops.
//   (2) "-[1-9]N/-N": power-side negative; toughness side any non-negative
//       (Cogwork Wrestler -2/-0 still counts, kills via power loss only).
//   (3) "-X/-X": variable debuff.
// The "/-" is anchored to "-" on both sides so "+1/-1" (asymmetric pump) is
// not matched here — that's handled by PATTERN_ASYMMETRIC. "-0/-0" is
// excluded by requiring at least one positive digit (1-9) somewhere.
// v0.22.0 — Patched Plaything: exclude "-N/-N counters" — the counter-as-noun
// form (Persist, Wither, enters-with-counters) is not a debuff effect; it's a
// counter axis. Negative lookahead `(?!\s+counters?)`.
// v0.32 — Group 16 — Overkill: "-0/-9999" added via the new `0/-[1-9]\d*` arm.
// v0.34 — 400-card audit batch (HIGH-19) — Gloom Ripper: "-0/-x" variable
// toughness-only debuff. Extend each arm's negative-side slot to accept `x`
// so "-0/-x", "-N/-x", and "-x/-N"/"-x/-0" variable forms all match.
const PATTERN = /(?:^|[\s(])-(?:0\/-(?:[1-9]\d*|x)|[1-9]\d*\/-(?:\d+|x)|x\/-(?:\d+|x|0))(?!\s+counters?)\b/;

// 2026-06-01 audit batch — Desperate Measures: "+1/-1" — asymmetric pump
// that buffs power but reduces toughness. Functionally a debuff because
// toughness goes down (can kill a 1-toughness creature). Match the
// `+N/-N` form where the toughness side is negative (N ≥ 1). The counter
// exclusion still applies.
const PATTERN_ASYMMETRIC = /(?:^|[\s(])\+(?:\d+|x)\/-(?:[1-9]\d*|x)(?!\s+counters?)\b/;

// v0.30 Group 6 — span-detect self-only static debuff: "__SELF__ gets
// -N/-N" (The Last Ride). This is a self-scaling vehicle, not a debuff to
// other creatures. The rule lacks a subject anchor, so we detect the
// self-scoped form as a precondition: if present, suppress.
const SELF_DEBUFF_SPAN = /\b__self__\s+gets\s+-(?:0\/-[1-9]\d*|[1-9]\d*\/-\d+|x\/-x)\b/;

export const rule: Rule = {
  id: 'effect.debuff_minus_n',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m) {
      const asym = t.match(PATTERN_ASYMMETRIC);
      return asym ? { evidence: asym[0] } : false;
    }
    // Suppress if the only -N/-N in the text is a self-scoped static
    // ("__self__ gets -X/-X"). Walk all matches; fire only if at least one
    // -N/-N exists outside a "__self__ gets -N/-N" span.
    if (SELF_DEBUFF_SPAN.test(t)) {
      const selfSpans: Array<[number, number]> = [];
      for (const sm of t.matchAll(new RegExp(SELF_DEBUFF_SPAN.source, 'g'))) {
        if (sm.index !== undefined) selfSpans.push([sm.index, sm.index + sm[0].length]);
      }
      for (const am of t.matchAll(new RegExp(PATTERN.source, 'g'))) {
        if (am.index === undefined) continue;
        const inside = selfSpans.some(([s, e]) => am.index! >= s && am.index! < e);
        if (!inside) return { evidence: am[0] };
      }
      return false;
    }
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['gets', 'get'], proximity: ['-'], window: 4 },
};
