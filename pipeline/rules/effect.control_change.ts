// pipeline/rules/effect.control_change.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.control_change',
  axis: 'effect',
  label: 'Steals control',
  description: "Gains control of an opponent's permanent.",
  // Weak pairings: control-change effects don't have natural same-graph counterparts
  // in v0.7. Defer until v0.2 LLM-assisted edge inference can identify
  // "untap-on-steal" / "haste-on-steal" synergy more precisely.
  pairsWith: [],
};

// "gain[s] control of [target|another target] [adjectives] (creature|permanent|artifact|...)"
const GAIN_CONTROL = /\b(?:gain|gains) control of (?:target |another target |that )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|enchantment|planeswalker|land)\b/;
// "exchange control of …" — both Threads of Disloyalty-style swaps.
const EXCHANGE = /\bexchange control of\b/;
// Aura/Equipment static control grant: "you control enchanted|attached|equipped <type>".
// Coerced to Kill (Aura), and Equipment analogs.
// 2026-06-02 audit batch — With Great Power / Avatar Destiny collide on the
// same substring after line concatenation: oracle lines "Enchant creature
// you control" + "Enchanted creature gets +2/+2 ..." normalize to "enchant
// creature you control enchanted creature gets +2/+2 ...". The leading
// "you control enchanted creature" is line-concat noise, not a steal — the
// real first clause is "enchant creature you control" (target-restricted
// Aura that doesn't change control). Discriminator: the noun is followed
// by a stat-buff verb (`gets? +N/+N` / `gets? +x/+x`) rather than a
// sentence terminator. Negative lookahead excludes the buff template;
// Coerced to Kill's "you control enchanted creature." still fires because
// the noun is followed by a period, not "gets".
const AURA_CONTROL = /\byou control (?:enchanted|attached|equipped) (?:creature|permanent|artifact|planeswalker|land)\b(?!\s+(?:gets?\s+[+\-](?:\d+|x)\/[+\-](?:\d+|x)|has\b|gains?\b))/;

// v0.23 — donation suppressor. "Target opponent gains control of <X>" / "an
// opponent gains control of <X>" is a *gift*, not a steal — the tagDef
// reserves this tag for "Gains control of an opponent's permanent". Scrub
// these spans before matching so Humble Defector / Harmless Offering /
// Wishclaw Talisman / Stiltzkin / Iroh stop FP'ing. Coveted Falcon / Zidane
// each have a legitimate steal clause earlier in the text; that clause survives
// the scrub and still matches GAIN_CONTROL.
const DONATION_SCRUB = /\b(?:target opponent|an opponent|each opponent|that opponent|they|that player) gains? control of [^.]+\.?/g;

export const rule: Rule = {
  id: 'effect.control_change',
  axis: 'effect',
  match: (t) => {
    const scrubbed = t.replace(DONATION_SCRUB, '');
    const m = scrubbed.match(GAIN_CONTROL) ?? scrubbed.match(EXCHANGE) ?? scrubbed.match(AURA_CONTROL);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['gain', 'control', 'exchange'], proximity: ['creature', 'permanent', 'target'], window: 8 },
};
