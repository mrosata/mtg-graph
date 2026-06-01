// pipeline/rules/trigger.commit_a_crime.ts
//
// MKM mechanic. "Whenever you commit a crime, …" — fires when the controller
// targets opponents, anything they control, or cards in their graveyards.
// Most cards constrain the trigger with "This ability triggers only once
// each turn" so it doesn't chain on multi-target spells.
//
// Past-tense / gated forms ("if you have committed a crime this turn")
// appear on a few cards as a conditional payoff rather than a fresh trigger.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.commit_a_crime',
  axis: 'trigger',
  label: 'Triggers on committing a crime',
  description:
    'Has an ability that triggers when you commit a crime (target an opponent, anything they control, or a card in their graveyard / hand / library). MKM mechanic.',
  // Producers are nearly any targeted spell or ability against an opponent's
  // game state. Listing the full set would create graph noise — leave pair
  // discovery to the user's own deck inputs.
  pairsWith: [],
};

// Anchor: any clause with `commit(s|ted)? a crime` — covers:
//   - "whenever you/an opponent/a player commit(s) a crime"  (canonical)
//   - "you've committed a crime this turn"  (gating via contraction)
//   - "as long as you've committed a crime"
//   - "if (you|an opponent) committed a crime"
// The phrase is mechanic-specific enough that no further qualifier is
// needed — no MTG card uses "commit a crime" in a non-mechanic sense.
const PATTERN = /\b(?:commits?|committed) a crime\b/;

export const rule: Rule = {
  id: 'trigger.commit_a_crime',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['crime'], proximity: ['whenever', 'commit', 'committed'], window: 4 },
};
