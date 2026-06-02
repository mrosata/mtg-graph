import { describe, it, expect } from 'vitest';
import { rule } from './effect.causes_damage';

describe('effect.causes_damage', () => {
  it.each([
    // Callous Sell-Sword adventure (Burn Together)
    ['target creature you control deals damage equal to its power to any other target'],
    // Soul's Fire-style fling
    ['target creature you control deals damage equal to its power to any target'],
    // Toughness-based fling
    ['target creature you control deals damage equal to its toughness to target creature you don\'t control'],
    // Literal-amount, external creature
    ['target creature deals 2 damage to any target'],
    // X-damage, external creature
    ['target creature you control deals x damage to target creature an opponent controls'],
    // Aura/Equipment frame
    ['enchanted creature deals damage equal to its power'],
    ['equipped creature deals 3 damage to target creature'],
    // "Another creature" frame
    ['another creature you control deals damage equal to its toughness'],
    // Plural "creatures ... each deal damage" frame (Graceful Takedown)
    ['any number of target enchanted creatures you control and up to one other target creature you control each deal damage equal to their power to target creature you don\'t control'],
    ['target creatures you control each deal damage equal to their power to target creature'],
    // Anaphoric "it" -- Bite Down on Crime / Archdruid's Charm shape:
    // prior sentence mentions "target creature you control", next sentence "it deals damage"
    ['target creature you control gets +2/+0 until end of turn. it deals damage equal to its power to target creature you don\'t control'],
    ['put a +1/+1 counter on target creature you control. it deals damage equal to its power to target creature you don\'t control'],
    // Group-bolt -- Case of the Gateway Express shape
    ['each creature you control deals 1 damage to that creature'],
    ['each creature you control deals 3 damage to target creature an opponent controls'],
    // v0.20 — anaphoric "then it deals damage" (Rabid Gnaw).
    ["target creature you control gets +1/+0 until end of turn. then it deals damage equal to its power to target creature you don't control."],
    // v0.20.0 — plural anaphoric "they each deal" with target-establishing
    // antecedent (Coordinated Clobbering).
    ['tap one or two target untapped creatures you control. they each deal damage equal to their power to target creature an opponent controls.'],
    // v0.20.0 — singular anaphoric "the creature you control deals damage"
    // with target-establishing antecedent (Beastie Beatdown).
    ['choose target creature you control and target creature an opponent controls. delirium — if there are four or more card types among cards in your graveyard, put two +1/+1 counters on the creature you control. the creature you control deals damage equal to its power to the creature an opponent controls.'],
    // 2026-06-01 audit batch — Bartz and Boko: tribal-scoped group damage.
    // "each other Bird you control deals damage equal to its power to
    // target creature an opponent controls".
    ['when __self__ enters, each other bird you control deals damage equal to its power to target creature an opponent controls.'],
    // HIGH-18a (Assert Perfection): tail relax — "up to (one|two|three) target creature".
    ['target creature you control gets +1/+0 until end of turn. it deals damage equal to its power to up to one target creature an opponent controls.'],
    // HIGH-18b (Champion of the Path): tribal-ETB anaphoric arm — "whenever (another|a) <tribe> you control enters, it deals damage equal to its power".
    ['whenever another elemental you control enters, it deals damage equal to its power to each opponent.'],
    ['whenever a goblin you control enters, it deals damage equal to its toughness to each opponent'],
  ])('matches indirect damage: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Self damage -- covered by effect.deals_damage, not this rule
    ['__self__ deals 2 damage to any target'],
    ['this creature deals 1 damage to each opponent'],
    ['this creature deals damage equal to its power to any target'],
    // Trigger contexts -- different axis
    ['whenever a creature deals damage'],
    ['whenever target creature deals combat damage to a player, draw a card'],
    // Conditional/prevention -- different axis
    ['if a creature would deal damage'],
    // Token creation + "it deals damage" -- pronoun back-reference; we don't
    // resolve "it" so this isn't tagged. Edge case; not common in standard.
    ['create a 2/2 creature token. it deals 2 damage to any target'],
    // Unrelated sentences ending in "it" that are NOT damage
    ['target creature you control gets +1/+1. it draws a card'],
    // Trigger wrapper around group-creature damage -- different axis
    ['whenever a creature you control deals damage to an opponent, you gain 1 life'],
    // Buff only, no damage
    ['each creature you control gets +1/+1 until end of turn'],
    // Unrelated
    ['draw a card'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
