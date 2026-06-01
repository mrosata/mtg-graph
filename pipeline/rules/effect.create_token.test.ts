import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_token';

describe('effect.create_token', () => {
  it.each([
    ['create a 1/1 white soldier creature token'],
    ['create a treasure token'],
    ['create two 2/2 green wolf creature tokens'],
    ['create a 1/1 colorless thopter artifact creature token'],
    // Regression (Stroke of Midnight): "its controller creates a ... token"
    // (third-person form when a different player creates the token).
    ['its controller creates a 1/1 white human creature token'],
    // Bare keyword forms: reminder text stripped pre-tag, so the keyword alone must fire.
    // Regression: Auspicious Arrival — "target creature gets +2/+2 until end of turn. investigate."
    ['target creature gets +2/+2 until end of turn. investigate.'],
    ['investigate'],
    // Mabel, Heir to Cragflame — named-token frame "create <Name>, a legendary
    // colorless Equipment artifact token". The comma between the token name
    // and its descriptor is the canonical templating for named legendary
    // tokens (LOTR, Bloomburrow, recent commander legends).
    ['create cragflame, a legendary colorless equipment artifact token with "equipped creature gets +1/+1 and has vigilance, trample, and haste" and equip {2}'],
    ['create the ring tempts you, a legendary colorless artifact token'],
    ['create wedding announcement, a legendary white enchantment token'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['whenever a token is created'],
    ['if a token was put onto the battlefield'],
    // v0.14.9 — Regression (Hunted Bonebrute): "target opponent creates ..."
    // The tokens go to the opponent, not the controller. Graph treats this
    // as a token producer for "cares about tokens you control" payoffs,
    // which is wrong. Mirror the typed-sacrifice NEGATIVE_EDICT exclusion.
    ['when this creature enters, target opponent creates two 1/1 white dog creature tokens'],
    ['each opponent creates a 2/2 zombie creature token'],
    ['an opponent creates a treasure token'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
