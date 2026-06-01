// pipeline/rules/effect.draws_or_discards.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.draws_or_discards',
  axis: 'effect',
  label: 'Draws or discards cards',
  description: 'Draws or discards cards.',
  pairsWith: ['trigger.card_drawn_discarded'],
};

// v0.22.0 — Spectral Snatcher: Ward—Discard a card. Ward is paid by the
// OPPONENT targeting this card, not by the controller. Strip the ward-cost
// span before matching (mirrors effect.sacrifice_creature NEGATIVE_WARD).
const WARD_DISCARD = /\bward\s*[—\-]\s*discards?\s+[^.\n]*/g;

export const rule: Rule = {
  id: 'effect.draws_or_discards',
  axis: 'effect',
  match: (raw) => {
    const t = raw.replace(WARD_DISCARD, '');
    // Subject slot expanded: not just "you" but also "each player/opponent",
    // "target player/opponent", and "that player" — for mass-discard frames
    // like Rankle's Prank ("• Each player discards two cards") and Mind Rot-
    // shaped sorceries.
    // Count slot expanded: "an additional card" (Lord Skitter's Blessing's
    // draw-step trigger) and "that many cards" (Malevolent Witchkite — drawn
    // count equals a sacrificed-count count).
    // `—` added to the leadin char class so the FIRST bullet of a modal
    // spell ("Choose one or more — • Each player discards two cards…")
    // reaches the subject slot. Without it the em-dash modal header swallows
    // the clause boundary and the regex falls off.
    // v0.21.0 — Miasma Demon: "any number of cards" added to count slot.
    const m = t.match(
      /(?:(?:^|[.,:\n—] ?)(?:then |and |may |• )?| and | then )(?:(?:you|each player|each opponent|target player|target opponent|that player|each of (?:\w+(?:'s)?\s+){1,3}(?:opponents?|controllers?|players?))\s+(?:may )?)?(?:draws?|discards?) (?:a card|an additional card|that many cards|any number of cards|cards equal to \S+|\d+ cards?|(?:two|three|four|five|six|seven|eight|nine|ten) cards?|[xn] cards?|(?:your|their) hand)/,
    );
    if (m) return { evidence: m[0] };
    // v0.15 — causative "have <opponent> draw/discard" frame (Alania,
    // Divergent Storm: "you may have target opponent draw a card"). The
    // controller is causing the opponent to draw; semantically still a
    // draw effect with this card as the source.
    const causative = t.match(
      /\b(?:you may )?have (?:target opponent|target player|each opponent|each player|that player|that opponent)\s+(?:draws?|discards?) (?:a card|that many cards|\d+ cards?|(?:two|three|four|five|six|seven|eight|nine|ten) cards?|[xn] cards?)/,
    );
    if (causative) return { evidence: causative[0] };
    // v0.20 — third-party subject without leadin punctuation (Mind Spiral:
    // "Target player draws three cards"; Season of the Burrow: "Its controller
    // draws a card"). The primary regex's leadin gate `(?:^|[.,:\n—] ?)`
    // requires a sentence boundary; space-bounded mid-sentence third-party
    // draws slipped through.
    const thirdParty = t.match(
      /\b(?:target\s+player|target\s+opponent|its\s+controller|that\s+player)\s+(?:may\s+)?(?:draws?|discards?)\s+(?:a card|that card|the chosen card|\d+ cards?|(?:two|three|four|five|six|seven|eight|nine|ten) cards?|[xn] cards?|cards equal to \S+)/,
    );
    if (thirdParty) return { evidence: thirdParty[0] };
    // v0.20.0 — bound-pronoun "they draw/discard" subject (Thought-Stalker
    // Warlock: "choose target opponent ... they discard that card"). The
    // sentence-leadin gate suppresses bare conditional clauses like
    // "if they discard a card" by requiring the punctuation/sentence boundary.
    const theySubject = t.match(
      /(?:^|[.,:\n] )they\s+(?:may\s+)?(?:draws?|discards?)\s+(?:a card|that card|the chosen card|\d+ cards?|(?:two|three|four) cards?)\b/,
    );
    if (theySubject) return { evidence: theySubject[0] };
    // v0.20 — alt-cost discard frame (The Infamous Cruelclaw:
    // "rather than paying its mana cost ... by discarding a card"). The
    // discard happens as a cost rather than as a top-level effect; still a
    // discard outcome from this card's perspective.
    const altCost = t.match(
      /\bby discarding (?:a card|one or more cards|\d+ cards|two cards|three cards|x cards)\b/,
    );
    if (altCost) return { evidence: altCost[0] };
    // v0.19 — Dark Confidant / Darkstar Augur frame: "reveal the top card of
    // your library ... put (that card|it) into your hand". Functionally a
    // draw — surfaces the top of library into the controller's hand without
    // a literal `draw` token. Tolerates "and"/". " bridges between the two
    // clauses (Darkstar Augur uses "and"; older printings split sentences).
    const revealToHand = t.match(
      /\breveal the top (?:\w+\s+)?card of your library[.,\s]*(?:and\s+)?put (?:that card|it) into your hand\b/,
    );
    if (revealToHand) return { evidence: revealToHand[0] };
    // v0.21.0 — Marina Vendrell: reveal-top-N-then-put-typed-subset-into-hand.
    // Multi-card reveal variant of the Dark Confidant frame. The N cards
    // surface a typed subset into the controller's hand — functionally a
    // typed-tutor draw.
    // v0.22.0 — Rip, Spawn Hunter: broadened the type-filter slot to admit
    // (a) multi-type "creature and/or vehicle" combinators, and (b) an
    // optional `with <filter>` qualifier ("with different powers", "with
    // mana value 3 or less").
    const revealMultiToHand = t.match(
      /\breveal\s+(?:the\s+)?top\s+\w+\s+cards?\s+of\s+(?:your|target\s+player's)\s+library\b[^.]*?\.\s*put\s+(?:all|the|any number of)\s+(?:[\w\-\/]+(?:\s+and(?:\/or)?\s+[\w\-\/]+)?\s+)?cards?(?:\s+with\s+[^.]{0,40}?)?\s+from\s+among\s+them\s+into\s+your\s+hand\b/,
    );
    return revealMultiToHand ? { evidence: revealMultiToHand[0] } : false;
  },
};
