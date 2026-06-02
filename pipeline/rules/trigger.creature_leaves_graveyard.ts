// pipeline/rules/trigger.creature_leaves_graveyard.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.creature_leaves_graveyard',
  axis: 'trigger',
  label: 'Triggers on cards leaving graveyard',
  description: 'Triggers when cards leave or are exiled from a graveyard.',
  pairsWith: ['effect.reanimate', 'effect.exile_from_graveyard'],
};

export const rule: Rule = {
  id: 'trigger.creature_leaves_graveyard',
  axis: 'trigger',
  match: (t) => {
    const direct = t.match(/whenever (?:a |one or more )?(?:[\w\-]+ ){0,2}cards? (?:leaves?|is exiled from|are exiled from) (?:a |your )?graveyard/);
    if (direct) return { evidence: direct[0] };
    // v0.30 — Group 8 — Dredger's Insight: compound type list with "and/or"
    // bridging the type qualifier ("artifact and/or creature cards leave
    // your graveyard"). The slash breaks the single-token filler in `direct`.
    const compoundType = t.match(/whenever (?:a |one or more )?[\w\-]+(?:\s+(?:and|or)(?:\/(?:and|or))?\s+[\w\-]+){1,3}\s+cards?\s+(?:leaves?|leave|is exiled from|are exiled from)\s+(?:a |your )?graveyard/);
    if (compoundType) return { evidence: compoundType[0] };
    // v0.30 — Group 8 — Ketramose: "cards are put into exile from
    // graveyards" (plural zone). Semantically a leaves-graveyard trigger
    // even when the zone source is plural / disjunctive.
    const putIntoExileFromGy = t.match(/whenever (?:a |one or more )?(?:[\w\-]+ ){0,2}cards?\s+(?:is|are)\s+put\s+into\s+exile\s+from\s+(?:a |your |an opponent's |any )?graveyards?/);
    if (putIntoExileFromGy) return { evidence: putIntoExileFromGy[0] };
    // v0.14.9 — Kaya, Spirits' Justice word order: "cards in <player>'s
    // graveyard are put into exile". Semantically a graveyard-leaves-via-
    // exile trigger; the verb is "are put into exile" rather than the
    // "are exiled from" pattern above. Filler accepts non-comma/non-period
    // chars so compound subjects (Kaya's "creatures you control AND/OR
    // creature cards in your graveyard") don't trip on the slash.
    const altWordOrder = t.match(
      /whenever\b[^.]*?\bcards?\s+(?:in|from)\s+(?:a|your|an opponent's|any)\s+graveyards?\s+(?:is|are)\s+put\s+into\s+exile/,
    );
    if (altWordOrder) return { evidence: altWordOrder[0] };
    // v0.12.9: "when a [type] card is exiled this way" anchored to a
    // preceding "exile … from … graveyard" clause in the same paragraph
    // (Agatha's Soul Cauldron). Both pieces must appear, with the
    // graveyard-exile clause first.
    const followup = t.match(
      /exiles?\s+[^.]*?from\s+(?:a|your|an opponent's|any)\s+graveyard\b[^.]*\.\s*when\s+(?:a|one or more)\s+(?:[\w\-]+\s+){0,2}cards?\s+(?:is|are)\s+exiled\s+this\s+way/,
    );
    return followup ? { evidence: followup[0] } : false;
  },
};
