// pipeline/rules/trigger.tapped_or_untapped.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.tapped_or_untapped';

describe('trigger.tapped_or_untapped', () => {
  it.each([
    ['whenever __self__ becomes tapped'],
    ['whenever a land you control is untapped'],
    // Regression (Sharae of Numbing Depths, Solitary Sanctuary): agent form
    // "whenever you tap [an untapped] creature" — same axis, active voice.
    ['whenever you tap one or more untapped creatures your opponents control, draw a card'],
    ['whenever you tap an untapped creature an opponent controls, put a +1/+1 counter on target creature you control'],
    // Regression (The Millennium Calendar): active "untap" voice of the same
    // axis — controller untaps permanents during their untap step.
    ['whenever you untap one or more permanents during your untap step, put that many time counters on __self__'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['tap target creature'],
    // "tap target creature" is an effect, not a trigger — must not fire even
    // with the broader rule.
    ['{t}: tap target creature an opponent controls'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
