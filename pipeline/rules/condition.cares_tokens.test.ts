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
    // v0.15 — "sacrifice N <adj> tokens" cost frame (Transmutation Font):
    // "sacrifice three artifact tokens with different names". Type adjective
    // ("artifact") between the count and "tokens" is admitted — still a
    // token-as-resource cost.
    ['sacrifice three artifact tokens with different names: search your library'],
    ['sacrifice two creature tokens: draw a card'],
    // Druid of the Spade — "as long as you control a token" gating condition.
    // The token-anthem axis: singular "a/an/N token(s)" determiner, not the
    // plural-with-noun-before-verb shape pattern 3 admits ("tokens you
    // control"). "as long as" / "while" framings are common for token
    // conditional anthems.
    ['as long as you control a token, this creature gets +2/+0 and has trample'],
    ['while you control a token, this creature has flying'],
    // Quantifier variants.
    ['as long as you control two tokens, draw a card'],
    ['whenever you control a creature token, gain 1 life'],
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
