import { describe, it, expect } from 'vitest';
import { rule } from './condition.teamwork';

describe('condition.teamwork', () => {
  it.each([
    // keyword line (normalized: "teamwork 3 (as an additional cost...")
    ['teamwork 3 (as an additional cost to cast this spell, you may tap any number of creatures you control with total power 3 or more.)'],
    // trigger that fires when tapped to pay teamwork cost
    ['whenever agent maria hill becomes tapped to pay a teamwork cost, put a +1/+1 counter on her and draw a card'],
    // inline reference — "if this spell was cast using teamwork, choose both instead"
    ['teamwork 4 (as an additional cost to cast this spell, you may tap any number of creatures you control with total power 4 or more.)\nchoose one. if this spell was cast using teamwork, choose both instead.'],
    // higher N
    ['teamwork 5 (as an additional cost to cast this spell, you may tap any number of creatures you control with total power 5 or more.)'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['flying\ndraw a card'],
    ['tap target creature'],
    ['whenever you attack with two or more creatures, draw a card'],
    ['creatures you control get +2/+2 until end of turn'],
    ['tap two untapped creatures you control: add {g}{g}'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
