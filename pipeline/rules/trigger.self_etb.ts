// pipeline/rules/trigger.self_etb.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.self_etb',
  axis: 'trigger',
  label: 'Triggers when this enters',
  description: 'Has an ability that triggers when this card itself enters the battlefield.',
  pairsWith: ['effect.bounce_or_blink', 'effect.reanimate'],
};

// Self-ETB triggers, accepted phrasings:
//   - "When __self__ enters..."          (legacy oracle templating, ~ → __SELF__)
//   - "When this <type> enters..."       (modern oracle templating)
//   - "Whenever this <type> enters [or attacks]..." (Impending cycle: combined
//     ETB + attack trigger; we want self_etb to fire too so ETB consumers pair)
//   - "As this <type> enters..."         (Crowd-Control Warden-style; functionally
//     an ETB effect even though "as" technically introduces a replacement effect)
//   - "As this <type> enters or is turned face up..." (face-up + ETB combined)
// "enters with"/"enters tapped"/"enters untapped" are excluded — those are
// ETB-modifier replacement effects, not triggered abilities.
// v0.14.20 — optional compound-subject suffix " or (a|another) <other-subject>"
// between "this <type>" and the verb. Lets self_etb fire on Projektor
// Inspector ("Whenever this creature or another Detective you control
// enters") — the self-half of the disjunction is a real self-ETB trigger.
// The other-half fires trigger.another_creature_etb separately.
// v0.15 — other-half slot widened from 40 → 80 chars to admit intervening
// "with <stat-filter>" qualifier tails (Vaultborn Tyrant: "another creature
// you control with power 4 or greater enters"). Non-greedy match still
// stops at the earliest "enters".
const SELF_ETB = new RegExp(
  '\\b(?:when|whenever|as) ' +
  '(?:__self__|this (?:__self__|creature|artifact|enchantment|land|permanent|planeswalker|vehicle|saga|aura|room|equipment|battle|case|class))' +
  '(?: or (?:a|another|one or more) [\\w\\-\\s]{1,80}?)?' +
  ' (?:enters(?:\\s+or (?:attacks|is turned face up))?(?!\\s+(?:with|tapped|untapped))|attacks or enters)' +
  '\\b[^.]*?,',
);

// "as X enters, ... it enters [tapped|with|...]" is a replacement-effect frame,
// not a trigger — exclude when the body has a follow-up "it enters" clause.
const AS_REPLACEMENT_FOLLOWUP = /\bit enters\b/;

export const rule: Rule = {
  id: 'trigger.self_etb',
  axis: 'trigger',
  match: (t) => {
    const m = t.match(SELF_ETB);
    if (!m) return false;
    if (m[0].startsWith('as ')) {
      // "as ... enters, ... it enters [tapped|with|...]" is a replacement-effect
      // frame describing how the card enters — exclude it. The "it enters"
      // clause may live in a separate sentence from the "as" clause.
      const matchEnd = (m.index ?? 0) + m[0].length;
      if (AS_REPLACEMENT_FOLLOWUP.test(t.slice(matchEnd))) return false;
    }
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['enters'], proximity: ['__self__', 'this'], window: 4 },
};
