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

// "-N/-N" where the power side is a positive integer (so it's a real debuff),
// and the toughness side is any non-negative integer (so "-N/-0" power-only
// debuffs like Cogwork Wrestler also count). Also "-X/-X". The "/-" is
// anchored to "-" on both sides so "+1/-1" (asymmetric pump) is not matched.
// Exclude "-0/-0" by requiring the first digit to be 1-9 or X.
// v0.22.0 — Patched Plaything: exclude "-N/-N counters" — the counter-as-noun
// form (Persist, Wither, enters-with-counters) is not a debuff effect; it's a
// counter axis. Negative lookahead `(?!\s+counters?)`.
const PATTERN = /(?:^|[\s(])-(?:[1-9]\d*\/-\d+|x\/-x)(?!\s+counters?)\b/;

// v0.30 Group 6 — span-detect self-only static debuff: "__SELF__ gets
// -N/-N" (The Last Ride). This is a self-scaling vehicle, not a debuff to
// other creatures. The rule lacks a subject anchor, so we detect the
// self-scoped form as a precondition: if present, suppress.
const SELF_DEBUFF_SPAN = /\b__self__\s+gets\s+-(?:[1-9]\d*\/-\d+|x\/-x)\b/;

export const rule: Rule = {
  id: 'effect.debuff_minus_n',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m) return false;
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
