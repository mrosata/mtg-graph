// pipeline/rules/trigger.self_etb.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.self_etb';

describe('trigger.self_etb', () => {
  it.each([
    // legacy templating
    ['when __self__ enters, draw a card'],
    ['when __self__ enters the battlefield, scry 2'],
    ['__self__ enters with a +1/+1 counter on it. when __self__ enters, gain 2 life'],
    // modern oracle templating
    ['when this creature enters, draw a card'],
    ['when this creature enters, scry 2.'],
    ['when this artifact enters, scry 2.'],
    ['when this enchantment enters, create a token'],
    ['when this land enters, scry 1.'],
    ['when this permanent enters, gain 1 life'],
    ['when this planeswalker enters, draw a card'],
    // "Whenever ... enters or attacks" (Impending cycle: Overlord of the Balemurk et al.)
    ['whenever this permanent enters or attacks, mill four cards'],
    ['whenever this creature enters or attacks, draw a card'],
    // reversed order
    ['whenever this creature attacks or enters, scry 1'],
    // Regression: Bitter Chill — "this Aura" / "this Room" / "this Equipment"
    // are valid modern self-references on those typed permanents.
    ['when this aura enters, tap enchanted creature'],
    ['when this room enters, draw two cards'],
    ['when this equipment enters, attach to target creature you control'],
    ['when this vehicle enters, crew it'],
    // Case and Class are 2024+ enchantment subtypes — "when this Case/Class enters"
    ['when this case enters, it deals 3 damage to target creature an opponent controls.'],
    ['when this class enters, add {g}{g}.'],
    // Crowd-Control Warden — "as this creature enters or is turned face up".
    ['as this creature enters or is turned face up, put x +1/+1 counters on it'],
    // Bare "as enters" without the face-up branch.
    ['as this creature enters, choose a creature type'],
    // Case of the Trampled Garden — Case-name substitution produces "this __self__".
    // (replaceSelfReferences swaps the "Case" segment of "Case of the Trampled Garden"
    // with __SELF__, so the normalized rule input is "when this __self__ enters,...".)
    ['when this __self__ enters, distribute two +1/+1 counters among one or two target creatures you control'],
    // v0.14.20 — compound subject "this X or another Y" (Projektor Inspector).
    // The self-ETB half of the disjunction should fire self_etb; the
    // other-ETB half fires another_creature_etb separately.
    ['whenever this creature or another detective you control enters and whenever a detective you control is turned face up, you may draw a card'],
    ['whenever this creature or another creature you control enters, draw a card'],
    // v0.15 — compound subject with intervening "with <stat-filter>" qualifier
    // tail (Vaultborn Tyrant): "this creature or another creature you control
    // with power 4 or greater enters". The other-half subject now exceeds the
    // legacy 40-char window; widened to 80.
    ['whenever this creature or another creature you control with power 4 or greater enters, you gain 3 life and draw a card'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['whenever a creature enters, draw a card'],
    ['whenever another creature enters the battlefield'],
    ['__self__ enters with a +1/+1 counter on it'],
    ['this creature enters with two +1/+1 counters'],
    ['draw a card'],
    // "whenever <something other than self>" must still not fire
    ['whenever another creature enters or attacks, draw a card'],
    // "When a Case enters" — "a" not "this", so NOT self_etb
    ['when a case enters, draw a card'],
    // Not ETB at all
    ['when this creature dies, draw a card'],
    // Replacement-effect "as X enters tapped" — NOT a triggered ability.
    ['as this creature enters, it enters tapped'],
    ['as this artifact enters tapped, choose a number'],
    ['as this artifact enters, choose a number. it enters with that many charge counters on it'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
