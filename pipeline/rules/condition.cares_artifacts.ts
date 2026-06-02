// pipeline/rules/condition.cares_artifacts.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_artifacts',
  axis: 'condition',
  label: 'Cares about artifacts',
  description: 'References artifact count, artifact ETBs, or artifacts you control.',
  pairsWith: [],
};

const PATTERNS = [
  /\bwhenever [\w\s]+? (?:cast(?:s)?\s+(?:an?\s+)?artifact|artifact [\w\s]+? enters)\b/,
  /\bfor each (?:[\w\s\-]+? )?artifacts? (?:you control )?/,
  /\bartifacts? you control\b/,
  /\bif you control (?:[\d]+ or more |[\w\s\-]+ )?artifacts?\b/,
  // "while/as long as/— you control N or more artifacts" — Case mechanic and similar count-based scaling.
  /\byou control (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) or more artifacts?\b/,
  // v0.12.9: ETB-this-turn gating — "if an artifact entered the battlefield
  // under your control this turn" (Akal Pakal, First Among Equals).
  // v0.14.1: added "as long as" (Shipwreck Sentry) and "this <type> or
  // another <type>" (Master's Manufactory) subject forms.
  /\b(?:if|when|as long as) (?:an?|one or more|this artifact or another) artifacts? (?:has |have )?entered the battlefield under your control this turn\b/,
  // v0.14.1: disjunctive cost form — "tap two untapped artifacts and/or
  // creatures you control" (Sunshot Militia). "you control" qualifies the
  // second noun, not "artifacts"; the conjunction still establishes artifacts
  // as a payoff resource.
  // v0.15: negative lookbehind for `target ` / `enchant ` — single-target type
  // filters (Molten Duplication's "target artifact or creature you control",
  // Moonlit Meditation's "enchant artifact or creature you control") are one-
  // time type filters at cast time, not artifact-payoff resource frames.
  /\b(?<!target\s)(?<!enchant\s)artifacts?\s+(?:and\/or|or)\s+\w+\s+you control\b/,
  // v0.14.1: disjunctive dig/reveal filter — "an artifact or <X> card"
  // (Staunch Crewmate's ETB digs for "artifact or Pirate card").
  // v0.15: negative lookahead for ` from your hand` — "exile/discard an
  // artifact or <type> card from your hand" (Nexus of Becoming) is a cost
  // type filter, not a dig-from-pile payoff that scales on artifact presence.
  /\ban? artifact or [\w\-]+ card\b(?! from your hand)/,
  // v0.14.6: artifact-aristocrats payoff (Anzrag's Rampage). X scales off the
  // count of "artifacts that were put into graveyards from the battlefield
  // this turn" — same as creatures_died but for artifacts.
  /\bartifacts? (?:that )?(?:were|have been) put into [\w\s]{0,30}?graveyards?\b/,
  // Variant: "artifacts that died (this turn)" — terser aristocrats phrasing.
  /\bartifacts? (?:that )?died\b/,
  // v0.14.7: per-turn sacrifice gate (Furtive Courier, Detective's Satchel).
  // "(as long as|if|activate only if) you('ve|have) sacrificed an artifact
  // (this turn)?" — payoff that gates on controller having sacrificed an
  // artifact during the current turn. Parallel to cares_creatures_died.
  /\byou(?:'ve| have) sacrificed (?:an?|one or more) artifacts?(?: this turn)?\b/,
  // v0.14.12: artifact-LtB observer trigger — "whenever an artifact is put
  // into a graveyard from the battlefield" / "whenever an artifact dies"
  // (Krenko, Baron of Tin Street; aristocrats-for-artifacts archetype). The
  // trigger frame on its own is a strong cares-artifacts signal even when the
  // controller doesn't act on the artifact directly.
  /\bwhenever (?:an?|one or more) artifacts? (?:is put into a graveyard from the battlefield|dies|die)\b/,
  // v0.14.12: controller-side aristocrats observer — "whenever you sacrifice
  // an artifact" (Magnetic Snuffler). Distinct from `effect.sacrifice_artifact`
  // (which is the cost/effect axis); this is the observer/payoff axis. The
  // "you sacrifice" subject specifically excludes the edict frame ("each
  // opponent sacrifices an artifact"), keeping the rule controller-sided.
  /\bwhenever you sacrifice (?:an?|one or more) artifacts?\b/,
  // 2026-06-01 audit Group 21 — "affinity for artifacts" (Demonic Junker).
  // Affinity is a printed keyword that scales the spell's cast cost by the
  // count of artifacts controlled — by definition cares about artifacts. The
  // reminder text "(This spell costs {1} less ... for each artifact you
  // control)" is stripped before rules run, so only the bare keyword remains.
  /\baffinity for artifacts\b/,
];

export const rule: Rule = {
  id: 'condition.cares_artifacts',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['artifact', 'artifacts'], proximity: ['cast', 'control', 'enters', 'each'], window: 6 },
};
