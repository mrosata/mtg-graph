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
  // v0.30 Group 3: also exclude "copy of an? artifact" (Waxen Shapethief) and
  // "choose an? artifact" (Intimidation Tactics) — both selector shapes, not
  // payoff frames.
  /\b(?<!target\s)(?<!enchant\s)(?<!copy of an?\s)(?<!copy of\s)(?<!choose an?\s)(?<!choose\s)artifacts?\s+(?:and\/or|or)\s+\w+\s+you control\b/,
  // v0.14.1: disjunctive dig/reveal filter — "an artifact or <X> card"
  // (Staunch Crewmate's ETB digs for "artifact or Pirate card").
  // v0.15: negative lookahead for ` from your hand` — "exile/discard an
  // artifact or <type> card from your hand" (Nexus of Becoming) is a cost
  // type filter, not a dig-from-pile payoff that scales on artifact presence.
  // v0.30 Group 3: extended exclusions for selector frames — `from your
  // graveyard` (Earthrumbler cost), `from it` (Intimidation Tactics chooses
  // from revealed hand), `in (a|your|target) graveyard` (other selector
  // shapes), `copy of an artifact or ...` (Waxen Shapethief clone), and
  // `choose an artifact or ...` (Intimidation Tactics chooser).
  /(?<!copy of\s)(?<!choose\s)\ban? artifact or [\w\-]+ card\b(?! from your hand| from your graveyard| from it| in (?:a|your|target) graveyard)/,
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
  // v0.30 — Group 4 — cost-reducer frame (Voyager Quickwelder): "Artifact
  // spells you cast cost {1} less" — payoff that scales utility per artifact
  // spell cast.
  /\bartifact (?:spells?|cards?) you cast\b/,
  // v0.30 — Group 4 — mana-restriction frame (Guidelight Optimizer): "Spend
  // this mana only to cast an artifact spell" — payoff routed through
  // restricted mana, still an artifact-payoff axis.
  /\bto cast an? artifact spell\b/,
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
