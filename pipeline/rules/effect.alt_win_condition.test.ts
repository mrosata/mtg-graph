// pipeline/rules/effect.alt_win_condition.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.alt_win_condition';

describe('effect.alt_win_condition', () => {
  it.each([
    // Maze's End — gated alt-win in an activated ability.
    ['this land enters tapped. {t}: add {c}. {3}, {t}, return this land to its owner\'s hand: search your library for a gate card, put it onto the battlefield, then shuffle. if you control ten or more gates with different names, you win the game.'],
    // Triskaidekaphile — upkeep-triggered alt-win.
    ['you have no maximum hand size. at the beginning of your upkeep, if you have exactly thirteen cards in your hand, you win the game.'],
    // Hellkite Tyrant — upkeep gate on artifact count.
    ['flying, trample whenever this creature deals combat damage to a player, gain control of all artifacts that player controls. at the beginning of your upkeep, if you control twenty or more artifacts, you win the game.'],
    // Mechanized Production — eight-of-a-name alt-win.
    ['enchant artifact you control at the beginning of your upkeep, create a token that\'s a copy of enchanted artifact. then if you control eight or more artifacts with the same name as one another, you win the game.'],
    // Opponent-loses-the-game form — same axis, imposed-loss direction.
    ['at the beginning of your end step, target opponent loses the game.'],
    // "that player loses the game" — combat-damage payoff form (Door to
    // Nothingness, classic alt-loss).
    ['{2}{w}{w}{u}{u}{b}{b}{r}{r}{g}{g}, {t}, sacrifice this artifact: target player loses the game.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // "can't lose / can't win" suppression — different axis (effect.cant_lose).
    // The bare phrases "you win the game" / "loses the game" never appear
    // un-negated here: "can't win" / "can't lose" only.
    ["you can't lose the game and your opponents can't win the game"],
    ['flash flying you can\'t lose the game and your opponents can\'t win the game.'],
    // Plain life-loss without the alt-loss phrasing.
    ['target opponent loses 3 life.'],
    ['each opponent loses 2 life.'],
    // Generic.
    ['draw a card.'],
    ['put a +1/+1 counter on target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
