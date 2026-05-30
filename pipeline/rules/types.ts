// pipeline/rules/types.ts
import type { Card, TagAxis } from '../../shared/types';

export type TagMatch = {
  evidence: string;
  metadata?: Record<string, unknown>;
};

export type NearMissSpec = {
  anchors: string[];     // words that must appear in the normalized text
  proximity: string[];   // words that must appear within `window` whitespace-tokens of any anchor
  window: number;        // token distance (typical: 6–10)
};

export type Rule = {
  id: string;            // matches a TagDef.tagId
  axis: TagAxis;
  /**
   * Match against the normalized oracle text. The common case. Either `match`
   * or `matchCard` must be defined; if both are defined, the rule fires when
   * EITHER produces a match (the text result wins on dual hits).
   */
  match?: (normalizedText: string) => boolean | TagMatch;
  /**
   * Match against structured card fields (e.g. `keywords`, `subtypes`) that
   * aren't reliably recoverable from the oracle text. Use sparingly — text
   * matching is the convention.
   *
   * The second argument is the normalized oracle text (same value passed to
   * `match`), so matchCard implementations can use `__self__` substitution
   * without re-running normalization.
   */
  matchCard?: (card: Card, normalizedText: string) => boolean | TagMatch;
  nearMiss?: NearMissSpec; // optional on legacy v0.6 rules; required on all rules added in v0.7
};
