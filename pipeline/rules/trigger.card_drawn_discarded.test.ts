// pipeline/rules/trigger.card_drawn_discarded.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.card_drawn_discarded';

describe('trigger.card_drawn_discarded', () => {
  it.each([
    ['whenever you draw a card'],
    ['whenever an opponent discards a card'],
    // Nth-draw triggers are a recurring set theme (e.g. MKM).
    ['whenever you draw your second card each turn'],
    ['whenever you draw your first card each turn'],
    ['whenever you draw your third card each turn'],
    ['whenever a player draws their second card each turn'],
    // Regression (Talion's Messenger): "When you discard a card this way" —
    // single-fire "when" trigger anchored to a preceding ability's discard,
    // not "whenever".
    ['when you discard a card this way, put a +1/+1 counter on target faerie you control'],
    // v0.12.9 — typed-card discard/draw triggers (Aclazotz, Deepest Betrayal
    // // Temple of the Dead). "Whenever an opponent discards a <type> card"
    // should still fire — the card type is a qualifier on the discarded card.
    ['whenever an opponent discards a land card, create a 1/1 black bat creature token with flying'],
    ['whenever a player discards a creature card, return it to the battlefield'],
    ['whenever you draw a creature card, you may put it onto the battlefield'],
    // Regression (Inti, Seneschal of the Sun): "one or more cards" batched form.
    ['whenever you discard one or more cards, exile the top card of your library.'],
    ['whenever an opponent draws one or more cards, you gain 1 life.'],
    ['whenever you discard one or more land cards, create a treasure token.'],
    // v0.15 — "one or more players discard one or more cards" plural-subject
    // frame (Hostile Investigator). The trigger fires on any draw/discard
    // event across all players — a global observer.
    ['whenever one or more players discard one or more cards, investigate'],
    ['whenever one or more players draw one or more cards, you gain 1 life'],
    // v0.39.0 — 200-card audit Ship 12e — Archfiend of Ifnir. "Whenever you
    // cycle or discard another card" — cycle is a discard-as-cost keyword
    // that pays a discard but isn't literally `discard`. The trigger is
    // observed on either verb.
    ['whenever you cycle or discard another card, put a -1/-1 counter on each creature your opponents control'],
    ['whenever you cycle a card, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['draw a card'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
