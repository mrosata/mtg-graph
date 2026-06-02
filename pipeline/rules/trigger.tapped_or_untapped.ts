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
    // v0.32 — Group 11 — Cryoshatter: "When enchanted creature becomes
    // tapped or is dealt damage" uses single-shot "when" rather than
    // "whenever". Broaden both arms to `when(?:ever)?` — same trigger axis.
    const passive = /when(?:ever)? (?:[^.]*?) (?:becomes tapped|becomes untapped|is tapped|is untapped)/;
    const active = /when(?:ever)? you (?:tap|untap) (?:one or more |an? )?(?:untapped |tapped )?[\w\s'-]+(?:,|\.)/;
    const m = t.match(passive) ?? t.match(active);
    return m ? { evidence: m[0] } : false;
  },
};
