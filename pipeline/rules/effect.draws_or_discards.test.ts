import { describe, it, expect } from 'vitest';
import { rule } from './effect.draws_or_discards';

describe('effect.draws_or_discards', () => {
  it.each([
    ['draw a card'],
    ['discard 2 cards'],
    ['you draw a card'],
    ['you discard a card'],
    ['draw 2 cards'],
    // Scryfall oracle text spells out small counts.
    ['draw three cards'],
    ['draw two cards'],
    ['draw seven cards'],
    ['discard three cards'],
    // Sequential / conjunction frames — must match (regression for audit findings).
    ['scry 1, then draw a card'],
    ['you gain 3 life and draw a card'],
    ['discard a card, then draw a card'],
    ['you may draw a card'],
    // Colon-introduced effect on activated abilities.
    ['{t}: draw a card'],
    ['{2}, {t}, sacrifice this artifact: you gain 3 life and draw a card'],
    // Bullet point (modal cards).
    ['• discard a card, then draw a card'],
    ['• draw two cards'],
    // Regression (Rankle's Prank): modal frame with non-"you" subject.
    ['• each player discards two cards'],
    // Regression (Rankle's Prank, first bullet — text after em-dash header).
    ['choose one or more — • each player discards two cards. • each player loses 4 life.'],
    // Regression (Lord Skitter's Blessing): "draw an additional card" frame.
    ['you lose 1 life and you draw an additional card'],
    // Regression (Malevolent Witchkite): variable-count "that many cards".
    ['sacrifice any number of artifacts, enchantments, and/or tokens, then draw that many cards'],
    // Regression (Audience with Trostani): "draw cards equal to" frame.
    ['create a 0/1 green plant creature token, then draw cards equal to the number of differently named creature tokens you control.'],
    // Regression (Alquist Proft, Master Sleuth): variable-X draw frame.
    ['you draw x cards and gain x life.'],
    ['sacrifice a clue: you draw x cards and gain x life.'],
    // Variable N form (e.g. "draw n cards" generically).
    ['draw n cards'],
    // Connecting the Dots — "discard your hand" as activation cost.
    ['{1}{r}, discard your hand, sacrifice this enchantment: put all cards exiled with this enchantment into their owners hands'],
    // Hellbent-enabler variant.
    ['discard your hand. then draw a card for each card discarded this way'],
    // v0.15 — causative "you may have target opponent draw a card" frame
    // (Alania, Divergent Storm). The card causes the opponent to draw; the
    // subject is the opponent but the controller is doing the causing.
    ['you may have target opponent draw a card'],
    ['have target player draw a card'],
    // Darkstar Augur (Dark Confidant frame) — "reveal the top card of your
    // library and put that card into your hand" is functionally a draw. No
    // literal `draw` token appears in the oracle text.
    ['at the beginning of your upkeep, reveal the top card of your library and put that card into your hand. you lose life equal to its mana value.'],
    // "Reveal the top card ... put it into your hand" variant.
    ['reveal the top card of your library. put it into your hand.'],
    // v0.20 — third-party draw without leadin punctuation (Mind Spiral).
    ['target player draws three cards'],
    // v0.20 — "its controller draws a card" (Season of the Burrow).
    ['its controller draws a card'],
    // v0.20 — alt-cost discard (The Infamous Cruelclaw).
    ['you may cast this spell rather than paying its mana cost by discarding a card'],
    // v0.20.0 — third-party "that player discards that card" (Cracked Skull).
    ["enchant creature when this aura enters, look at target player's hand. you may choose a nonland card from it. that player discards that card. when enchanted creature is dealt damage, destroy it."],
    // v0.20.0 — bound-pronoun "they discard a card / that card" with prior
    // antecedent (Thought-Stalker Warlock).
    ['menace when this creature enters, choose target opponent. if they lost life this turn, they reveal their hand, you choose a nonland card from it, and they discard that card. otherwise, they discard a card.'],
    // v0.21.0 — Marina Vendrell: reveal-N-then-put-into-hand frame.
    // Functionally a typed-tutor draw — reveals top N, puts the typed subset
    // into hand, bottoms the rest. The Dark-Confidant arm handles "top
    // card" (singular); this admits multi-card reveals.
    ['when this creature enters, reveal the top seven cards of your library. put all enchantment cards from among them into your hand and the rest on the bottom of your library in a random order.'],
    ['reveal the top five cards of your library. put any number of creature cards from among them into your hand.'],
    // v0.22.0 — Rip, Spawn Hunter: multi-type "creature and/or vehicle cards
    // with different powers from among them into your hand". The H20 arm
    // needs `and/or` combinator + optional `with <filter>` qualifier.
    ['reveal the top x cards of your library, where x is its power. put any number of creature and/or vehicle cards with different powers from among them into your hand.'],
    ['reveal the top six cards of your library. put any number of artifact and/or enchantment cards with mana value 3 or less from among them into your hand.'],
    // v0.21.0 — Miasma Demon: "discard any number of cards" — the existing
    // count slot listed digits / one-through-ten / x — needs `any number of`
    // added.
    ['you may discard any number of cards'],
    ['when this creature enters, you may discard any number of cards. when you do, up to that many target creatures each get -2/-2 until end of turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['whenever you draw a card'],
    ['if you would draw a card'],
    ['each time you draw a card'],
    // v0.22.0 — Spectral Snatcher: Ward—Discard a card. The Ward cost is paid
    // by the OPPONENT targeting this card, not by the controller. Same
    // exclusion shape as the v0.20 effect.sacrifice_creature NEGATIVE_WARD.
    ['ward—discard a card.'],
    ['flying ward—discard a card.'],
    ['ward—discard a card. swampcycling {2}'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
