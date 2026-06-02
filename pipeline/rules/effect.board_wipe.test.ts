import { describe, it, expect } from 'vitest';
import { rule } from './effect.board_wipe';

describe('effect.board_wipe', () => {
  it.each([
    ['destroy all creatures'],
    ['destroy all creatures with mana value 3 or less'],
    ['exile all creatures'],
    ['destroy each creature'],
    ['destroy all nonland permanents'],
    ['destroy all attacking creatures'],
    ['exile each nontoken creature'],
    ['destroy all artifacts and enchantments'],
    // v0.14.9 — Regression (Ill-Timed Explosion): red-sweeper "deals N damage
    // to each creature" frame. Sweeps the whole battlefield even though the
    // verb is "deals damage" rather than "destroy/exile". Standard family:
    // Pyroclasm, Anger of the Gods, Sweltering Suns, Brotherhood's End.
    ['__self__ deals x damage to each creature, where x is the greatest mana value among cards discarded this way'],
    ['__self__ deals 2 damage to each creature'],
    ['this spell deals 4 damage to each nontoken creature'],
    ['__self__ deals 3 damage to each creature and planeswalker'],
    // v0.30 — Group 20 — Shefet Archfiend: mass -N/-N debuff "all other
    // creatures get -2/-2 until end of turn". Functionally a wipe (any
    // creature with toughness 2 or less dies). Distinct from single-target
    // -N/-N. Anchored on "all" so single-target debuffs stay excluded.
    ['flying when this creature enters, all other creatures get -2/-2 until end of turn. cycling {2}'],
    ['all creatures get -3/-3 until end of turn'],
    ['all other creatures get -1/-1 until end of turn'],
    // 2026-06-02 audit batch — Day of Black Sun: "each creature ... loses
    // all abilities. destroy those creatures." The "destroy those
    // creatures" arm anchors on a preceding "each creature" antecedent
    // within the same compound sentence — semantically a board wipe.
    ['each creature with mana value x or less loses all abilities until end of turn. destroy those creatures.'],
    // 2026-06-02 audit batch — Destined Confrontation: "each player ...
    // sacrifices all other creatures they control". The verb alternation
    // needs to admit `sacrifice` alongside `destroy|exile`.
    ['each player chooses any number of creatures they control with total power 4 or less, then sacrifices all other creatures they control.'],
    ['sacrifices all other creatures they control'],
    ['sacrifice all other creatures'],
    ['sacrifice all creatures'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['destroy target creature'],
    ['all creatures get +1/+1 until end of turn'],
    ['target creature gets -3/-3 until end of turn'],
    ['return all creatures to their owners hands'],
    ['draw a card'],
    ['counter target spell'],
    // 2026-06-01 audit Group 7 — Steel Hellkite: "destroy each nonland
    // permanent with mana value x whose controller was dealt combat damage by
    // this creature this turn" is COMBAT-DAMAGE-GATED targeted removal of a
    // narrow subset, not a wipe. Specific "whose controller was dealt combat
    // damage" tail must suppress the wipe interpretation.
    ['{x}: destroy each nonland permanent with mana value x whose controller was dealt combat damage by this creature this turn'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
