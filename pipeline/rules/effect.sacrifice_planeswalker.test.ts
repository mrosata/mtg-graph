import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_planeswalker';

describe('effect.sacrifice_planeswalker', () => {
  it.each([
    ['sacrifice a planeswalker'],
    ['sacrifice another planeswalker'],
    ['sacrifice target planeswalker'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonplaneswalker permanent'],
    ['sacrifice a creature'],
    ['destroy target planeswalker'],
    // v0.14.1 — edict leak. Throne of the Grim Captain: "each opponent
    // sacrifices a nonland permanent" — edict, not a controller-side sac.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
    // Regression (Ward—Sacrifice pattern): Ward cost is paid by the
    // OPPONENT targeting this card. Handled via NEGATIVE_WARD span.
    ['ward—sacrifice a planeswalker.'],
    // Wave-2 Win 6 (2026-06-01 audit) — Pox Plague: multi-clause "each
    // player ... sacrifices ... permanents" edict.
    ['each player loses half their life, then discards half the cards in their hand, then sacrifices half the permanents they control of their choice. round down each time.'],
    // Wave-2 Win 6 — observer trigger frames.
    ['whenever a player sacrifices a planeswalker, draw a card.'],
    ['whenever an opponent sacrifices a permanent, you gain 1 life.'],
    // Plain `target player` / `each player` edicts.
    ['target player sacrifices a planeswalker.'],
    ['each player sacrifices a permanent.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
