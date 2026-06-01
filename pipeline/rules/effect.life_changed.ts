// pipeline/rules/effect.life_changed.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.life_changed',
  axis: 'effect',
  label: 'Changes life total',
  description: 'Causes a player to gain or lose life.',
  pairsWith: ['trigger.life_changed'],
};

export const rule: Rule = {
  id: 'effect.life_changed',
  axis: 'effect',
  match: (t) => {
    // Subject list expanded: "each opponent" / "each player" / "that player"
    // for drain-style end-step effects (Eriette of the Charmed Apple).
    // Amount allows `x` alongside literal digits — many drains scale with a
    // count rather than a fixed number ("loses X life, where X is...").
    // Leadin `• ` added so modal-bullet frames ("• Each player loses 4 life",
    // Rankle's Prank) reach the subject slot. `—` added to the boundary char
    // class so the FIRST bullet (right after the modal em-dash header) also
    // matches — without it, only bullets preceded by an earlier sentence's
    // period would fire.
    // Two amount forms:
    //   (1) literal quantifier — "gains 3 life", "loses x life"
    //   (2) variable via "equal to" — "gain life equal to its power" (Syr
    //       Ginger), "loses life equal to the number of …". The "equal to"
    //       requirement keeps trigger phrasings like "whenever you gain life"
    //       from matching.
    // v0.14.1 — digit slot relaxed to `[\d,]+` so comma-separated amounts
    // like "1,000 life" (The Millennium Calendar) match.
    // v0.15 — anaphoric "they" added to the subject list (Bandit's Talent:
    // "if that player has one or fewer cards in hand, they lose 2 life" —
    // "they" back-references "that player" in the preceding clause).
    const QUANT = /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|target player|target opponent|each opponent|each player|that player|that opponent|they) (?:may )?)?(?:gains?|loses?) (?:[\d,]+|x) life/;
    const VARIABLE = /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|target player|target opponent|each opponent|each player|that player|that opponent|they) (?:may )?)?(?:gains?|loses?) life equal to /;
    // v0.15 — "pay N life" cost frame (Bonecache Overseer: "Pay 1 life" as
    // activation cost). Paying life is functionally life loss for the
    // controller. Allows X / digit / comma-amount.
    const PAY = /\bpay (?:[\d,]+|x) life\b/;
    const m = t.match(QUANT) ?? t.match(VARIABLE) ?? t.match(PAY);
    return m ? { evidence: m[0] } : false;
  },
};
