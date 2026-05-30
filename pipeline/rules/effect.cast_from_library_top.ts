// pipeline/rules/effect.cast_from_library_top.ts
//
// Grants permission to cast or play cards from the top of your library —
// the Future Sight / Vivien Champion / Garruk's Horde family. Distinct
// from Cascade and Discover (which exile-then-cast at resolution, not as
// a persistent permission).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cast_from_library_top',
  axis: 'effect',
  label: 'Cast from library top',
  description:
    'Grants permission to cast or play cards from the top of your library (Future Sight / Vivien Champion / Garruk\'s Horde family). Covers `cast/play <thing> from the top of your library` permission frames. Distinct from Cascade and Discover (which exile-then-cast as part of resolution, already covered by their own axes).',
  pairsWith: [],
};

// Pattern 1: canonical license — "may cast/play <thing> from the top of your library"
const MAY_CAST_FROM_TOP =
  /\bmay (?:cast|play) (?:[\w\s,]+? )?from the top of your library\b/;

// Pattern 2: "may play the top card of your library" frame (Oracle of Mul Daya,
// land-only top-of-library plays).
const MAY_PLAY_TOP_CARD =
  /\bmay play the top card of (?:your|their) library\b/;

const PATTERNS: ReadonlyArray<RegExp> = [MAY_CAST_FROM_TOP, MAY_PLAY_TOP_CARD];

export const rule: Rule = {
  id: 'effect.cast_from_library_top',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['from the top of your library', 'top card of your library'],
    proximity: ['may cast', 'may play'],
    window: 6,
  },
};
