// pipeline/rules/condition.cares_low_mana_value.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_low_mana_value';

describe('condition.cares_low_mana_value', () => {
  it.each([
    // Feed the Cauldron
    ['destroy target creature with mana value 3 or less. if it\'s your turn, create a food token'],
    // Cut Down
    ['destroy target creature with mana value 2 or less'],
    // Hypothetical counterspell
    ['counter target spell with mana value 2 or less'],
    // Exile variant
    ['exile target creature with mana value 4 or less'],
    // Pluralized / different attribute (mana value of the spell)
    ['target creature an opponent controls with mana value 3 or less can\'t attack or block'],
    // v0.14.10 — Regression (Beseech the Mirror, Soul Search, Guidelight
    // Pathmaker, Thunderous Velocipede). Some cards use the verb-bearing
    // frame "mana value IS N or less" instead of bare "mana value N or less".
    // Same semantic — a low-MV gate — so the optional "is " arm admits both.
    ['if that spell\'s mana value is 4 or less'],
    ['if its mana value is 2 or less'],
    // v0.30 — Group 7 — Quag Feast: count-comparator form "mana value is
    // less than or equal to the number of cards in your graveyard". The
    // ceiling is a dynamic count rather than a literal N — still a low-MV
    // gate axis. Per ship list tiebreaker we do NOT admit bare "mana value
    // N" (would flip the negative at line 32).
    ['choose target creature, planeswalker, or vehicle. mill two cards, then destroy the chosen permanent if its mana value is less than or equal to the number of cards in your graveyard.'],
    ['its mana value is less than or equal to x'],
    ['if its mana value ≤ the amount of damage'],
    // v0.35.0 — Batch 10: past-tense "was N or less" (Tainted Treats: "if
    // its mana value was 4 or less, create a food token"). Trigger-aftermath
    // condition that references the destroyed permanent's MV.
    ['destroy target artifact or creature. if its mana value was 4 or less, create a food token.'],
    // v0.35.0 — Batch 10: X-placeholder count slot (Vicious Rivalry "with
    // mana value X or less", Mind into Matter "with mana value X or less").
    // Variable-X spells where the cast-time X bounds the affected set.
    ['as an additional cost to cast this spell, pay x life. destroy all artifacts and creatures with mana value x or less.'],
    ['draw x cards. then you may put a permanent card with mana value x or less from your hand onto the battlefield tapped.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // High-mana-value side
    ['counter target spell with mana value 4 or greater'],
    ['whenever you cast a spell with mana value 5 or more'],
    // Self-describing
    ['this creature has mana value 2'],
    // Unrelated
    ['draw a card'],
    ['destroy target creature'],
    // v0.47.0 — Kotis, Fangkeeper: definitional clause "mana value x or less,
    // where x is the amount of combat damage dealt". The "where x is" suffix
    // defines what X means in Kotis's rules text; it's not a low-MV gate.
    ['mana value x or less, where x is the amount of combat damage dealt.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  it.each([
    // v0.47.0 — Preserved positives: Vicious Rivalry / Mind into Matter
    // (X-count without "where x is" definition) must still fire.
    ['as an additional cost to cast this spell, pay x life. destroy all artifacts and creatures with mana value x or less.'],
    // Quag Feast equivalence (dynamic comparator, no "where x is").
    ['its mana value is less than or equal to x'],
  ])('preserved positives (not blocked by Kotis exclusion): %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });
});
