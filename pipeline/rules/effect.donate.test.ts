// pipeline/rules/effect.donate.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.donate';

describe('effect.donate', () => {
  it.each([
    // Harmless Offering — canonical.
    ['target opponent gains control of target permanent you control.'],
    // Humble Defector — gives away itself.
    ['{t}: draw two cards. target opponent gains control of this creature. activate only during your turn.'],
    // Wishclaw Talisman — donates as part of tutor cost.
    ['{1}, {t}, remove a wish counter from this artifact: search your library for a card, put it into your hand, then shuffle. an opponent gains control of this artifact. activate only during your turn.'],
    // Stiltzkin — pure donation engine.
    ['lifelink {2}, {t}: target opponent gains control of another target permanent you control. if they do, you draw a card.'],
    // Iroh — alternate templating ("have target opponent gain control").
    ['at the beginning of combat on your turn, you may have target opponent gain control of target permanent you control. when you do, create a 1/1 white ally creature token.'],
    // v0.30 — Group 23 — Trade the Helm: "Exchange control of <X> you
    // control and <Y> an opponent controls". Exchange is bidirectional but
    // structurally includes the donate half (your permanent goes to an
    // opponent).
    ['exchange control of target artifact or creature you control and target artifact or creature an opponent controls. cycling {2}'],
    ['exchange control of two target creatures'],
  ])('matches donate phrasings: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Mind Control — steal direction (you take their stuff). Different axis.
    ['gain control of target creature'],
    ['you gain control of target artifact'],
    ['gain control of target permanent'],
    // Buff — unrelated.
    ['target creature you control gets +2/+0 until end of turn'],
    // Destroy / removal — unrelated.
    ['destroy target permanent'],
    // Lose life — unrelated.
    ['target opponent loses 3 life'],
    // Opponent controls (state check, not control change) — must not fire.
    ['target opponent controls a creature'],
    // Zidane, Tantalus Thief — triggered on opponent gaining control (a payoff
    // for donation, not a donation itself). Must not fire.
    ['whenever an opponent gains control of a permanent from you, you create a treasure token.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
