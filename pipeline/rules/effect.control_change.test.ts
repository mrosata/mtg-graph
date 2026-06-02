import { describe, it, expect } from 'vitest';
import { rule } from './effect.control_change';

describe('effect.control_change', () => {
  it.each([
    ['gain control of target creature'],
    ['gain control of target permanent'],
    ['you gain control of target artifact'],
    ['exchange control of two target creatures'],
    ['gain control of target nonland permanent'],
    ['gains control of target creature until end of turn'],
    ['gain control of another target creature'],
    // Coveted Falcon — mixed donation + legitimate steal; the leading clause
    // is a steal and must survive the donation scrub.
    ["whenever this creature attacks, gain control of target permanent you own but don't control. disguise {1}{u}"],
    // Zidane, Tantalus Thief — mixed: ETB steal + observe-opponent-gain trigger;
    // the steal clause must still match.
    ["when zidane enters, gain control of target creature an opponent controls until end of turn."],
    // Coerced to Kill — Aura Control Magic template. The normalized form
    // line-concatenates "Enchant creature" + "You control enchanted
    // creature." → "enchant creature you control enchanted creature. ...".
    // Distinct from With Great Power-style buffs where the line-concat
    // produces "enchant creature you control enchanted creature gets +2/+2
    // ..." — the noun is followed by a buff verb, not a sentence boundary.
    // The AURA_CONTROL match requires the noun NOT be followed by a
    // stat-buff verb.
    ['enchant creature you control enchanted creature. enchanted creature has base power and toughness 1/1, has deathtouch, and is an assassin in addition to its other types.'],
    ['enchant creature you control enchanted creature'],
    // Variants for the Aura family.
    ['you control enchanted permanent'],
    ['you control attached creature'],
    ['you control equipped creature'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['creatures you control get +1/+1 until end of turn'],     // cares-about, not take-control
    ['this creature you control'],                              // self-reference
    ['draw a card'],                                            // unrelated
    ['destroy target creature'],                                // unrelated
    ['target creature you control gets +2/+0'],                 // bestowing on own creature
    ['target opponent controls a creature'],                    // opponent control, not gain
    // Humble Defector — pure donation: opponent gains control of YOUR card.
    ["{t}: draw two cards. target opponent gains control of this creature. activate only during your turn."],
    // Harmless Offering — pure donation.
    ['target opponent gains control of target permanent you control.'],
    // Wishclaw Talisman — donation as part of tutor cost.
    ['{1}, {t}, remove a wish counter from this artifact: search your library for a card. an opponent gains control of this artifact.'],
    // Stiltzkin, Moogle Merchant — pure donation engine.
    ['lifelink {2}, {t}: target opponent gains control of another target permanent you control. if they do, you draw a card.'],
    // Iroh, Tea Master — donate, then create a token.
    ['at the beginning of combat on your turn, you may have target opponent gain control of target permanent you control. when you do, create a 1/1 white ally creature token.'],
    // 2026-06-02 audit batch — With Great Power: Aura buff template. Oracle
    // lines "Enchant creature you control" + "Enchanted creature gets +2/+2
    // for each Aura ..." normalize to "enchant creature you control enchanted
    // creature gets +2/+2 ..." via line concatenation. The collision with
    // Control Magic's "you control enchanted creature" substring is broken
    // by requiring the noun NOT be followed by a stat-buff verb.
    ['enchant creature you control enchanted creature gets +2/+2 for each aura and equipment attached to it. all damage that would be dealt to you is dealt to enchanted creature instead.'],
    // Avatar Destiny — same Aura-buff template, different payoff.
    ['enchant creature you control enchanted creature gets +1/+1 for each creature card in your graveyard and is an avatar in addition to its other types.'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
