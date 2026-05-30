// pipeline/rules/effect.clone_in_place.ts
//
// Half of the v0.14.0 split of the legacy `effect.copy_permanent`. This tag
// fires when an EXISTING permanent transforms into a copy of another permanent
// — no token is created, no token_created event. Includes "X becomes a copy of"
// (Deepfathom Echo) and "you may have this <type> enter as a copy of"
// (Mockingbird, Echoing Deeps — including the "enter tapped as a copy" variant
// per the v0.13 audit).
//
// Splitting this away from `effect.copy_permanent_token` removes the phantom
// `trigger.token_created` edges that the v0.13 umbrella was emitting into
// every `condition.cares_tokens` consumer for clone-in-place cards.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.clone_in_place',
  axis: 'effect',
  label: 'Clones an existing permanent in place',
  description: 'Transforms an existing permanent into a copy of another permanent (no token created). Includes "becomes a copy of" and "enter[s] (tapped) as a copy of" frames.',
  // The clone enters or transforms — self-ETB triggers may key off it. No
  // token_created pairing (that was the v0.13 bug — there is no token here).
  pairsWith: ['trigger.self_etb'],
};

// "copy target/that/the [adjectives] (creature|permanent|artifact|enchantment|planeswalker|land)".
// Excludes "spell|instant|sorcery" — those belong to effect.copy_spell. This
// rule still claims the bare "copy" verb form even though Standard cards rarely
// use it on permanents (the modern templating is "becomes a copy"/"enters as a
// copy"); when it does occur, it's an in-place clone effect, not a token.
const COPY_DIRECT = /\bcopy (?:target |that |the )?(?:[\w\-]+ )?(?:creature|permanent|artifact|enchantment|planeswalker|land)\b/;
// "X becomes a copy of …" — transforms an existing permanent into a copy.
// We require "permanent|creature|artifact|enchantment|planeswalker|land|it|that"
// as the thing being copied so we don't capture stray "becomes a copy" in
// flavor text.
const BECOMES_COPY = /\bbecomes? a copy of (?:target |another target |another |that |the |any |an? )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|enchantment|planeswalker|land|it)\b/;
// "you may have this creature enter as a copy of …" — Mockingbird-style ETB-
// as-copy. Per the v0.13 audit, accept 0-2 inserted modifier words ("enter
// tapped as a copy of …", Echoing Deeps).
const ENTER_AS_COPY = /\benter(?:s)?(?:\s+\w+){0,2}\s+as a copy of\b/;

export const rule: Rule = {
  id: 'effect.clone_in_place',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(BECOMES_COPY) ??
      t.match(ENTER_AS_COPY) ??
      t.match(COPY_DIRECT);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['copy', 'copies'], proximity: ['becomes', 'enter', 'enters'], window: 6 },
};
