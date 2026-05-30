import { describe, it, expect } from 'vitest';
import { rule } from './effect.debuff_minus_n';

describe('effect.debuff_minus_n', () => {
  it.each([
    ['target creature gets -3/-3 until end of turn'],
    ['target creature gets -1/-1 until end of turn'],
    ['creatures your opponents control get -2/-2 until end of turn'],
    ['target creature gets -x/-x until end of turn'],
    ['all creatures get -2/-2 until end of turn'],
    // Regression (Cogwork Wrestler): power-only debuff (-N/-0). Still a
    // debuff — same axis, just doesn't kill via toughness.
    ['when this creature enters, target creature an opponent controls gets -2/-0 until end of turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['target creature gets +3/+3 until end of turn'],
    ['target creature gets +1/-1 until end of turn'],
    ['target creature gets +0/+1 until end of turn'],
    ['put a +1/+1 counter on target creature'],
    ['target creature gets +x/+x until end of turn'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
