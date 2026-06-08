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
    // 2026-06-02 audit batch — admit optional `each\s+` between subject and
    // verb (Parker Luck: "they each lose life equal to ..."). The "each"
    // intensifier distributes the loss/gain over the plural antecedent;
    // structurally still life_changed.
    // 2026-06-02 audit batch — also admit a brief "who doesn't" / "who
    // does" filler between subject and verb (The Death of Gwen Stacy:
    // "each player who doesn't loses 3 life"). The filler describes a
    // sub-class of the subject; the life-change still resolves.
    // v0.35.0 — Batch 28: added `its controller|its owner` to the subject
    // alternation. Emeritus of Truce // Swords to Plowshares: "Exile target
    // creature. Its controller gains life equal to its power." The anaphoric
    // "its controller" subject binds to the exiled creature's controller —
    // canonical Swords to Plowshares frame.
    const QUANT = /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|target player|target opponent|each opponent|each player|that player|that opponent|they|its controller|its owner|defending player|attacking player)(?:\s+who\s+(?:doesn't|does|did|didn't))?\s+(?:each\s+)?(?:may\s+)?)?(?:gains?|loses?) (?:[\d,]+|x) life/;
    const VARIABLE = /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|target player|target opponent|each opponent|each player|that player|that opponent|they|its controller|its owner|defending player|attacking player)(?:\s+who\s+(?:doesn't|does|did|didn't))?\s+(?:each\s+)?(?:may\s+)?)?(?:gains?|loses?) life equal to /;
    // v0.15 — "pay N life" cost frame (Bonecache Overseer: "Pay 1 life" as
    // activation cost). Paying life is functionally life loss for the
    // controller. Allows X / digit / comma-amount.
    // 2026-06-01 audit Group 4 — Sire of Seven Deaths: the negative lookbehind
    // `(?<!ward—)` (em-dash U+2014) excludes the "Ward—Pay N life" protection
    // cost template, where the cost is paid by the OPPONENT casting a spell
    // that targets this creature, not by the controller of the printed text.
    const PAY = /(?<!ward—)\bpay (?:[\d,]+|x) life\b/;
    // v0.20.0 — anaphoric "that much life" (Enduring Tenacity: "whenever you
    // gain life, target opponent loses that much life"). The amount is bound
    // to the prior trigger condition rather than a digit/x quantifier.
    // 2026-06-01 audit batch — Cecil, Dark Knight: "you lose that much life"
    // (anaphoric on a prior damage-amount). Self-target life loss is a
    // life-change effect.
    const THAT_MUCH = /(?:(?:^|[.,:\n—] ?)(?:then |and )?)(?:target opponent|each opponent|each player|target player|that player|they|you|defending player|attacking player)\s+loses?\s+that much life\b/;
    // v0.21.0 — Grievous Wound: fractional / catch-all life loss ("they lose
    // half their life, rounded up"). The amount is "half/all/x [of] their
    // life" — semantically still life_changed.
    const FRACTIONAL = /(?:target opponent|each opponent|each player|target player|that player|they|enchanted player|you|defending player|attacking player)\s+loses?\s+(?:half|all|x)\s+(?:of\s+)?their\s+life\b/;
    // v0.21.0 — Leyline of Hope: replacement-effect lifegain upgrade ("you
    // gain that much life plus N instead"). Functionally a life-change.
    const REPLACEMENT_GAIN = /\byou gain that much life plus\s+\d+\s+instead\b/;
    // FIX 11 (BR-6) — Bloodthirsty Conqueror: bare "you gain that much
    // life" anaphoric to a prior opponent-loses-life trigger. The amount
    // binds to the triggering loss; semantically lifegain.
    // 2026-06-02 audit batch — Earth Kingdom General: "you may gain that
    // much life" — admit optional `may ` between subject and verb.
    const YOU_THAT_MUCH = /\byou\s+(?:may\s+)?gains?\s+that much life\b/;
    // v0.23 — variable PAY ("pay life equal to <X>" alt-cost — Eye of
    // Duskmantle, Valgavoth Terror Eater, Raubahn, Gwenom, Madame Null,
    // War Room, Marshland Bloodcaster, Nashi Moon Sage's Scion).
    const PAY_VARIABLE = /\bpay life equal to /;
    // v0.23 — causative "have <subject> lose/gain N life" (Blood Seeker,
    // Gempalm Polluter, Ob Nixilis the Fallen — "have target player lose 1
    // life"). Mirrors the causative arm in effect.draws_or_discards. Required
    // `life` terminator prevents FP on "have X lose N cards" style frames.
    const CAUSATIVE = /\b(?:you may )?have (?:target opponent|target player|each opponent|each player|that player|that opponent|them|defending player|attacking player)\s+(?:gains?|loses?)\s+(?:[\d,]+|x)\s+life\b/;
    // Variable causative — "have target player lose life equal to <X>"
    // (Gempalm Polluter).
    const CAUSATIVE_VARIABLE = /\b(?:you may )?have (?:target opponent|target player|each opponent|each player|that player|that opponent|them|defending player|attacking player)\s+(?:gains?|loses?) life equal to /;
    // v0.32 — Group 10 — The Endstone: "your life total becomes half your
    // starting life total, rounded up". Direct life-total assignment is a
    // life-change effect (the player ends up at a new life total, regardless
    // of whether the text uses the gain/lose verb).
    const BECOMES = /\b(?:your|target player's|each opponent's|that player's|each player's|target opponent's|defending player's|attacking player's)\s+life total becomes\b/;
    const m =
      t.match(QUANT) ??
      t.match(VARIABLE) ??
      t.match(PAY) ??
      t.match(PAY_VARIABLE) ??
      t.match(THAT_MUCH) ??
      t.match(FRACTIONAL) ??
      t.match(REPLACEMENT_GAIN) ??
      t.match(YOU_THAT_MUCH) ??
      t.match(CAUSATIVE) ??
      t.match(CAUSATIVE_VARIABLE) ??
      t.match(BECOMES);
    return m ? { evidence: m[0] } : false;
  },
};
