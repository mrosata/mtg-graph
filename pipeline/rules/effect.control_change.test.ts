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
    // Coerced to Kill — Aura Control Magic template.
    ['enchant creature. you control enchanted creature'],
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
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
