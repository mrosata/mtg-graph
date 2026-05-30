import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_tokens';

describe('condition.cares_tokens', () => {
  it.each([
    ['whenever a token you control enters, draw a card'],
    ['whenever you create a token, scry 1'],
    ['for each token you control, this creature gets +1/+0'],
    ['tokens you control get +1/+1 until end of turn'],
    ['if you control three or more tokens, draw a card'],
    ['creature tokens you control have haste'],
    ['treasure tokens you control are also food tokens'],
    // v0.14.1 — replacement-effect "would be created" frame. Ojer Taq: "if
    // one or more creature tokens would be created under your control, ...".
    ['if one or more creature tokens would be created under your control, three times that many of those tokens are created instead'],
    ['if a creature token would be created, that token enters tapped'],
    // v0.14.9 — Regression (Izoni, Center of the Web): "sacrifice N tokens"
    // activation cost — tokens used as a paid resource is a token-payoff
    // signal per tagDef "Triggers or scales off tokens you control or create."
    ['sacrifice four tokens: surveil 2, then draw two cards'],
    ['sacrifice a token: gain 1 life'],
    ['sacrifice three tokens: draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a token that is a copy of target creature'],   // effect, not condition
    ['create a 2/2 white knight creature token'],           // effect, not condition
    ['this token has flying'],                              // describes token, not payoff
    ['destroy target creature'],                            // unrelated
    ['draw a card'],                                        // unrelated
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
