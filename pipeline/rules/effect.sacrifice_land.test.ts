import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_land';

describe('effect.sacrifice_land', () => {
  it.each([
    ['sacrifice a land'],
    ['sacrifice another land'],
    ['sacrifice target land'],
    ['sacrifice two lands'],
    ['as an additional cost to cast this spell, sacrifice a land'],
    ['sacrifice a permanent'],
    ['sacrifice a noncreature permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonland permanent'],
    ['sacrifice a creature'],
    ['destroy target land'],
    // v0.14.1 — aristocrats trigger leak. Vito: "whenever you sacrifice
    // another permanent" — this card observes sacs, doesn't perform them.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
    // Regression (Ward—Sacrifice pattern): Ward cost is paid by the
    // OPPONENT targeting this card. Handled via NEGATIVE_WARD span.
    ['ward—sacrifice a land.'],
    // Wave-2 Win 6 (2026-06-01 audit) — Pox Plague: multi-clause "each
    // player ... sacrifices ... permanents" edict.
    ['each player loses half their life, then discards half the cards in their hand, then sacrifices half the permanents they control of their choice. round down each time.'],
    // Wave-2 Win 6 — observer trigger frames.
    ['whenever a player sacrifices a land, draw a card.'],
    ['whenever an opponent sacrifices a permanent, you gain 1 life.'],
    // Plain `target player` / `each player` edicts.
    ['target player sacrifices a land.'],
    ['each player sacrifices a permanent.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
