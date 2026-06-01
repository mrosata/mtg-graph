// pipeline/rules/trigger.another_creature_etb.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.another_creature_etb',
  axis: 'trigger',
  label: 'Triggers when another creature enters',
  description: 'Has an ability that triggers when a creature (other than itself) enters the battlefield.',
  pairsWith: ['effect.create_creature_token', 'effect.reanimate', 'effect.bounce_or_blink'],
};

export const rule: Rule = {
  id: 'trigger.another_creature_etb',
  axis: 'trigger',
  match: (t) => {
    // Subject and verb relaxed to plural: "whenever one or more (nontoken )?
    // creatures ... enter" (Extraordinary Journey, plural-form ETB triggers).
    // Pre-noun adjective slot `(?:[\w\-]+ ){0,3}` admits "a legendary creature"
    // (The Irencrag), "a nontoken creature", "a colorless creature", etc.
    //
    // v0.14.1: outer determiner is now MANDATORY (`a | another | one or more`)
    // — previously optional, which let "whenever this creature enters" leak
    // (the "this " consumed the adjective slot). Self-ETB has trigger.self_etb;
    // this rule explicitly scopes to OTHER creatures.
    //
    // v0.14.13: post-creature qualifier slot bumped from {0,3} to {0,8} to
    // tolerate "with <attribute> N or less/greater" tails (Marketwatch Phantom,
    // Neighborhood Guardian: "whenever another creature you control with power
    // 2 or less enters"). `\s+\w+` requires whitespace between tokens and word
    // chars only, so the slot implicitly stops at commas / punctuation —
    // protecting against bridging into unrelated subsequent clauses.
    const m = t.match(
      /whenever (?:a |another |one or more (?:nontoken )?)(?:[\w\-]+ ){0,3}creatures?(?:\s+\w+){0,8}\s+enters?/,
    );
    if (m) return { evidence: m[0] };
    // Tribal arm: "whenever (a|another) <tribe> you control enters" (Lord
    // Skitter, Obyra, Case of the Pilfered Proof, and any tribal ETB lord).
    // The next word after the determiner names a creature TYPE, not
    // "creature" itself. We exclude the other permanent-type words so we
    // don't poach edges from the dedicated trigger.another_<type>_etb tags.
    // v0.14.6 — accept "a" determiner alongside "another" (Pilfered Proof).
    const tribal = t.match(
      /whenever (?:a|another)\s+(?!(?:artifact|enchantment|land|planeswalker|battle|permanent|token|creature)\b)[\w\-]+\s+(?:you control\s+)?(?:enters?|enters or is turned face up)/,
    );
    if (tribal) return { evidence: tribal[0] };
    // v0.14.20 — compound subject "this <type> or another <subject>"
    // (Projektor Inspector). The other-ETB half of the disjunction should
    // fire even though the leading "this <type>" is the trigger.self_etb
    // half. Accepts both generic "creature" and tribal sub-subjects.
    // v0.15 — other-half slot widened from 40 → 80 chars to admit
    // "with <stat-filter>" qualifier tails (Vaultborn Tyrant).
    const compound = t.match(
      /whenever this (?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker) or (?:a|another|one or more) [\w\-\s]{1,80}?(?:enters?|enters or is turned face up)/,
    );
    return compound ? { evidence: compound[0] } : false;
  },
  nearMiss: { anchors: ['enters'], proximity: ['creature'], window: 6 },
};
