import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_suspected';

describe('condition.cares_suspected', () => {
  it.each([
    // Agrus Kos — "if it's suspected"
    ["if it's suspected, exile it."],
    // Agency Coroner — "was suspected"
    ['if the sacrificed creature was suspected, draw two cards instead.'],
    // Eliminate the Impossible — "are suspected"
    ['if any of them are suspected, they\'re no longer suspected.'],
    // Rubblebelt Braggart — "is not suspected"
    ["whenever this creature attacks, if it's not suspected, you may suspect it."],
    // Deadly Complication — "target suspected creature"
    ['put a +1/+1 counter on target suspected creature you control.'],
    // Rune-Brand Juggler — "sacrifice a suspected creature"
    ['{3}{b}{r}, sacrifice a suspected creature: target creature gets -5/-5 until end of turn.'],
    // Case of the Stashed Skeleton — "suspected skeletons you control"
    ['to solve — you control no suspected skeletons.'],
    // Clandestine Meddler — "suspected creatures you control"
    ['whenever one or more suspected creatures you control attack, surveil 1.'],
    // Airtight Alibi — "can't become suspected"
    ["enchanted creature gets +2/+2 and can't become suspected."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Producer phrasing — the verb form, not the adjective
    ['when this creature enters, suspect it.'],
    // Clearer-only frame — the (?!no longer\s+) lookahead must block this
    ["it's no longer suspected."],
    ['all suspected creatures are no longer suspected.'],
    // Unrelated mechanic
    ['draw a card.'],
    ['destroy target creature.'],
    ['create a clue token.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression: Airtight Alibi shape must produce exactly ONE cares hit
  // on "it's suspected" — the lookahead must prevent the second clause
  // ("it's no longer suspected") from also satisfying the rule.
  it('matches exactly the cares-suspected span in a combined frame', () => {
    const text = "if it's suspected, it's no longer suspected.";
    const result = rule.match!(text);
    expect(result).toBeTruthy();
    if (typeof result === 'object' && result) {
      // Evidence should be the FIRST occurrence — "it's suspected", not
      // "it's no longer suspected".
      expect(result.evidence).toBe("it's suspected");
    }
  });
});
