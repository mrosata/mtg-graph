// pipeline/rules/trigger.token_created.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.token_created';

describe('trigger.token_created', () => {
  it.each([
    ['whenever a token is created'],
    ['whenever one or more tokens are created under your control'],
    // Regression (Wildwood Mentor): modern templating uses "token enters"
    // interchangeably with "token is created".
    ['whenever a token you control enters, put a +1/+1 counter on __self__'],
    ['whenever one or more tokens you control enter, draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a 1/1 token'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
