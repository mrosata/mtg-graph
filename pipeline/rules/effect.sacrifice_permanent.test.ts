import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_permanent';

describe('effect.sacrifice_permanent (parent, universal-only)', () => {
  it.each([
    ['sacrifice a permanent'],
    ['sacrifice another permanent'],
    ['sacrifice target permanent'],
    ['sacrifice three permanents'],
    ['sacrifice a nontoken permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
    ['sacrifice a creature'],
    ['sacrifice an artifact'],
    ['sacrifice an enchantment'],
    ['sacrifice a land'],
    ['destroy target permanent'],
    // v0.14.1 — edict leak. "Each opponent sacrifices a nonland permanent"
    // (Throne of the Grim Captain) is an edict, not a controller-side sac.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito observes sacs, doesn't do them.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
    // Regression (Ward—Sacrifice pattern): Ward cost is paid by the
    // OPPONENT targeting this card. Handled via NEGATIVE_WARD span.
    ['ward—sacrifice a permanent.'],
    // Wave-2 Win 6 (2026-06-01 audit) — Pox Plague: multi-clause "each
    // player ... sacrifices ... permanents" edict. The verb is separated
    // from the subject by intermediate clauses ("loses life", "discards").
    ['each player loses half their life, then discards half the cards in their hand, then sacrifices half the permanents they control of their choice. round down each time.'],
    // Wave-2 Win 6 — observer trigger frames.
    ['whenever a player sacrifices another permanent, draw a card.'],
    ['whenever an opponent sacrifices a permanent, you gain 1 life.'],
    // Plain `target player` / `each player` edicts.
    ['target player sacrifices a permanent.'],
    ['each player sacrifices a permanent.'],
    // v0.32 — Group 2 — Command Bridge: "sacrifice it unless you tap an
    // untapped permanent" is a "fail-to-pay" alternate-cost clause, not a
    // generic sacrifice-a-permanent effect. The permanent in the "unless"
    // clause is the cost the controller pays to AVOID sacrificing.
    ['this land enters tapped. when this land enters, sacrifice it unless you tap an untapped permanent you control. {t}: add one mana of any color.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
