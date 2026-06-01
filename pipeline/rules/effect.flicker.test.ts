import { describe, it, expect } from 'vitest';
import { rule } from './effect.flicker';

describe('effect.flicker', () => {
  it.each([
    // Kykar, Zephyr Awakener — exile + delayed end-step return.
    ["exile another target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    // Charming Prince — exile + delayed end-step return.
    ['exile another target creature you own. return it to the battlefield under your control at the beginning of the next end step.'],
    // Ennis, Debate Moderator — "exile up to one other target creature".
    ["when ennis enters, exile up to one other target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    // Niko, Light of Hope — sentence-bridged delayed return.
    ["{2}, {t}: exile target nonlegendary creature you control. shards you control become copies of it until the next end step. return it to the battlefield under its owner's control at the beginning of the next end step."],
    // Generic flicker — "return it to the battlefield ... at the beginning of the next end step"
    ['exile target creature. return it to the battlefield at the beginning of the next end step.'],
    // Until-end-of-turn variant: "exile ... return ... at the beginning of the next turn"
    ['exile target creature. return that card to the battlefield at the beginning of the next turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Plain bounce — return to hand, not exile + delayed return.
    ["return target creature to its owner's hand"],
    // Blink (immediate return) — not flicker (which is delayed).
    ['exile target creature you control, then return it to the battlefield under its owner\'s control.'],
    ['exile target creature, then return that creature to the battlefield under its owner\'s control'],
    // Reanimate — graveyard → battlefield.
    ['return target creature card from your graveyard to the battlefield.'],
    // Plain exile without return.
    ['exile target creature'],
    // Delayed return TO HAND (bounce-blinkback like Anzrag's Rampage) — not flicker.
    ['you may put a creature card exiled this way onto the battlefield. it gains haste. return it to your hand at the beginning of the next end step'],
    // Cheat into play — onto battlefield from hand, no exile first.
    ['put a creature card from your hand onto the battlefield'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
