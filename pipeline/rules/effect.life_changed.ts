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
    const QUANT = /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|target player|target opponent|each opponent|each player|that player|that opponent) (?:may )?)?(?:gains?|loses?) (?:[\d,]+|x) life/;
    const VARIABLE = /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|target player|target opponent|each opponent|each player|that player|that opponent) (?:may )?)?(?:gains?|loses?) life equal to /;
    const m = t.match(QUANT) ?? t.match(VARIABLE);
    return m ? { evidence: m[0] } : false;
  },
};
