// pipeline/rules/trigger.tapped_or_untapped.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.tapped_or_untapped',
  axis: 'trigger',
  label: 'Triggers on tap or untap',
  description: 'Triggers when a permanent becomes tapped or untapped.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'trigger.tapped_or_untapped',
  axis: 'trigger',
  match: (t) => {
    // Two shapes:
    //   - Passive: "whenever X becomes tapped / is untapped" (legacy form).
    //   - Active: "whenever you tap [an untapped] <subject>" (Sharae of
    //     Numbing Depths, Solitary Sanctuary). Same trigger axis, just
    //     phrased in active voice.
    const passive = /whenever (?:[^.]*?) (?:becomes tapped|becomes untapped|is tapped|is untapped)/;
    const active = /whenever you (?:tap|untap) (?:one or more |an? )?(?:untapped |tapped )?[\w\s'-]+(?:,|\.)/;
    const m = t.match(passive) ?? t.match(active);
    return m ? { evidence: m[0] } : false;
  },
};
