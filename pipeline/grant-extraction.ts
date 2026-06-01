// pipeline/grant-extraction.ts
//
// Win 1 (v0.24-audit) — extract inner-quoted grant bodies BEFORE the
// normalization step strips them. Cards like Tale of Katara and Toph
// ("Creatures you control have '<inner trigger>.'") otherwise lose their
// entire mechanical body to `stripQuotedAbilities` and end up with zero
// tags.
//
// This module:
//   - Finds the inner-text spans of grant frames in the raw oracle text.
//   - Normalizes those inner spans for re-tagging (lowercase, reminder
//     strip, `~ → __SELF__`).
//
// The tagging side (in pipeline/index.ts `tagCards`) then runs the rule
// extractor on each inner span and forwards a filtered subset of results
// onto the source card with `granted: <evidence>` prefix.

import { stripReminderText } from './normalize';

// Grant-host frames. Captures the inner ability body in group 1.
//
// We anchor on the grant-VERB immediately preceding the quote rather than
// trying to enumerate the subject's noun-phrase shape (subjects can be
// long-tailed: "Each land and Ally you control", "Up to one other target
// creature an opponent controls", and so on, often with "and gain X and
// '<inner>'" chains that elide the subject entirely).
//
// Two anchor classes:
//   - Grant verbs: `has | have | gains | gain` — anthems and target-grants.
//   - `with` — used in "create … <type> token with '<inner>'" templates and
//     also in "becomes a … <type> with '<inner>'" animations.
//
// Both shapes admit straight ("…") and curly (“…”) double quotes.
const GRANT_FRAMES: RegExp[] = [
  // Grant-verb-anchored: direct adjacency to the open quote
  /\b(?:has|have|gains?|gain)\s+["“]([^"”]+)["”]/gi,
  // Grant-verb continuation: "<verb> menace and '<inner>'" — the verb
  // (gain/has) governs both the keyword list and the quoted ability.
  // Oracle text uses literal quoted spans only in grant contexts (no
  // dialogue), so `and|or` immediately preceding an open-quote is safe.
  /\b(?:and|or)\s+["“]([^"”]+)["”]/gi,
  // `with`-anchored (token creation, becomes-permanent animations)
  /\bwith\s+["“]([^"”]+)["”]/gi,
];

export function extractGrantedInnerTexts(rawOracleText: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const re of GRANT_FRAMES) {
    // RegExp with `g` flag — reset lastIndex defensively in case the same
    // regex literal is reused across calls.
    re.lastIndex = 0;
    for (const m of rawOracleText.matchAll(re)) {
      const inner = m[1]?.trim();
      if (inner && !seen.has(inner)) {
        seen.add(inner);
        out.push(inner);
      }
    }
  }
  return out;
}

// Normalize the inner-grant text for re-tagging. Distinct from
// `normalizeOracleText` (the host-card normalizer) in two ways:
//
//   1. We do NOT substitute the source card's name — "this creature" inside
//      the grant refers to the GRANTED permanent, not the source.
//   2. We do not need quote-stripping since the inner span is what was
//      already inside the host's quotes.
//
// We still:
//   - strip reminder text in parens
//   - replace ~ with __SELF__ (rare in grants, but defensive)
//   - lowercase
//   - collapse newlines to spaces
export function normalizeInnerGrantText(inner: string): string {
  const stripped = stripReminderText(inner);
  return stripped.replace(/~/g, '__SELF__').toLowerCase().replace(/\s*\n+\s*/g, ' ');
}
