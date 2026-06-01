// pipeline/rules/effect.edict.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.edict';

describe('effect.edict', () => {
  it.each([
    // Diabolic Edict / Tribute to Hunger / Consumed by Greed
    ['target opponent sacrifices a creature.'],
    // Gix's Command / Deadly Brew / Pick Your Poison
    ['each opponent sacrifices a creature.'],
    // Innocent Blood / Season of Loss / Social Snub
    ['each player sacrifices a creature.'],
    // Liliana, Dreadhorde General / Rankle's Prank / Abyssal Gorestalker
    ['each player sacrifices two creatures.'],
    // Susurian Dirgecraft
    ['each opponent sacrifices a nontoken creature.'],
    // Throne of the Grim Captain
    ['each opponent sacrifices a nonland permanent.'],
    // Kefka, Ruler of Ruin
    ['each opponent sacrifices a permanent.'],
    // Meathook Massacre II
    ['each player sacrifices x creatures.'],
    // Sporogenic Infection / Gatekeeper of Malakir
    ['target player sacrifices a creature.'],
    // v0.14.6 — punisher template (Zoyowa Lava-Tongue). The opponent's
    // CHOICE is forced; the edict semantic still applies — pairs with
    // opponent-side dies triggers same as classic edicts.
    ['each opponent may discard a card or sacrifice a permanent of their choice.'],
    ['each player may pay 3 life or sacrifice a creature.'],
    // v0.14.23 — "may sacrifice N ..." punisher without an "or" arm
    // (Rakdos, Patron of Chaos). The choice is binary: pay the sacrifice
    // cost or accept the alternative effect ("if they don't, you draw").
    ["at the beginning of your end step, target opponent may sacrifice two nonland, nontoken permanents of their choice. if they don't, you draw two cards."],
    ['target opponent may sacrifice three creatures of their choice.'],
    // v0.20 — "unless that player sacrifices" punisher-edict (Rottenmouth
    // Viper). The opponent has a choice between the loss-of-life effect
    // and an enforced sacrifice; pairs the same as a classic edict.
    ['each opponent loses 4 life unless that player sacrifices a nonland permanent of their choice or discards a card'],
    // v0.22.0 — Vile Mutilator: chained "each opponent sacrifices a nontoken
    // enchantment ..., then sacrifices a nontoken creature ...". The first
    // sacrifice is non-creature/permanent; the second is the creature. The
    // chained-edict arm picks up the creature sacrifice in the second clause.
    ['each opponent sacrifices a nontoken enchantment of their choice, then sacrifices a nontoken creature of their choice.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Controller-side sacrifice — NOT an edict
    ['as an additional cost to cast this spell, sacrifice a creature.'],
    ['sacrifice a creature: add one mana of any color.'],
    ['sacrifice another creature.'],
    // Unrelated
    ['target opponent loses 2 life.'],
    ['each opponent draws a card.'],
    // Edict-adjacent but not a sacrifice (discard)
    ['each opponent discards a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
