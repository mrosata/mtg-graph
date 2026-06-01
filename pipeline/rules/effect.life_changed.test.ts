import { describe, it, expect } from 'vitest';
import { rule } from './effect.life_changed';

describe('effect.life_changed', () => {
  it.each([
    ['you gain 3 life'],
    ['target opponent loses 2 life'],
    ['target player loses 4 life'],
    ['you lose 1 life'],
    ['you gain 1 life'],
    // "may" between pronoun and verb is common (e.g. Ancient Cornucopia).
    [", you may gain 1 life for each of that spell's colors"],
    ['you may gain 2 life'],
    // Colon-introduced effect on activated abilities (regression: Candy Trail).
    ['{2}, {t}, sacrifice this artifact: you gain 3 life and draw a card'],
    ['{t}: you gain 1 life'],
    // Sequential / conjunction frames.
    ['draw a card, then you gain 2 life'],
    // Regression: Eriette of the Charmed Apple — "each opponent loses X life
    // and you gain X life" pair. Subject is "each opponent", amount is the
    // letter X (variable), not an integer.
    ['at the beginning of your end step, each opponent loses x life and you gain x life'],
    ['each opponent loses 2 life'],
    ['target opponent loses x life'],
    // Regression (Rankle's Prank): modal frame with "each player" subject.
    ['• each player loses 4 life'],
    // Regression (Rankle's Prank, first-bullet form): em-dash modal header
    // precedes the first bullet — no preceding period to anchor the leadin.
    ['choose one or more — • each player loses 4 life. • each player sacrifices two creatures'],
    // Regression (Syr Ginger): variable-amount form "gain life equal to ..."
    // — the quantifier is the entire "equal to X" clause rather than a digit.
    ['{2}, {t}, sacrifice __self__: you gain life equal to its power'],
    ['target opponent loses life equal to the number of cards in your hand'],
    // v0.14.1 — comma-separated thousand-digit amounts. The Millennium
    // Calendar: "each opponent loses 1,000 life".
    ['when there are 1,000 or more time counters on __self__, sacrifice it and each opponent loses 1,000 life'],
    ['you gain 1,000 life'],
    // Regression (Tomik, Wielder of Law): anaphoric "that opponent" subject —
    // the conditional preamble re-introduces the attacker as "that opponent",
    // which wasn't in the allowlist.
    ['whenever an opponent attacks with creatures, if two or more of those creatures are attacking you and/or planeswalkers you control, that opponent loses 3 life and you draw a card'],
    ['that opponent loses 2 life'],
    // v0.15 — anaphoric "they" subject (Bandit's Talent): "at the beginning
    // of each opponent's upkeep, if that player has one or fewer cards in
    // hand, they lose 2 life". The "they" pronoun back-references the
    // "that player" mentioned in the preceding conditional clause.
    ['if that player has one or fewer cards in hand, they lose 2 life'],
    // v0.15 — "pay N life" cost frame (Bonecache Overseer): "{T}, Pay 1
    // life: Draw a card". Pay-life-as-cost causes life loss the same way
    // "lose N life" does.
    ['{t}, pay 1 life: draw a card'],
    ['{2}, pay 3 life, {t}: scry 2'],
    // v0.20.0 — Enduring Tenacity: "whenever you gain life, target opponent
    // loses that much life". Anaphoric "that much life" — the amount is
    // bound to the trigger condition rather than a digit/x quantifier.
    ['whenever you gain life, target opponent loses that much life. when __self__ dies, if it was a creature, return it to the battlefield under its owner\'s control. it\'s an enchantment.'],
    ['target opponent loses that much life'],
    // v0.21.0 — Grievous Wound: "whenever enchanted player is dealt damage,
    // they lose half their life, rounded up". The amount "half their life"
    // is a fractional life-loss form distinct from digit/x quantifiers.
    ['enchanted player can\'t gain life. whenever enchanted player is dealt damage, they lose half their life, rounded up.'],
    ['target opponent loses half their life'],
    ['that player loses all their life'],
    // v0.21.0 — Leyline of Hope: replacement effect that upgrades lifegain
    // "you gain that much life plus 1 instead". This is a life-modifying
    // replacement; semantically still life_changed.
    ['if you would gain life, you gain that much life plus 1 instead'],
    ['you gain that much life plus 2 instead'],
    // v0.23 — variable "pay life equal to X" (Eye of Duskmantle, War Room).
    ['you pay life equal to its mana value rather than paying its mana cost.'],
    ['{t}, pay life equal to the number of cards in your hand: draw a card.'],
    // v0.23 — causative "have <X> lose N life" (Blood Seeker shape).
    ['whenever another creature enters under an opponent\'s control, you may have that player lose 1 life.'],
    // Causative variable "have <X> lose life equal to" (Gempalm Polluter).
    ['when you cycle this card, you may have target player lose life equal to the number of zombies on the battlefield.'],
    // FIX 11 (BR-6) — Bloodthirsty Conqueror: bare "you gain that much life"
    // anaphoric to a prior opponent-loses-life trigger. The amount is bound
    // to the triggering loss; semantically lifegain. The previous
    // REPLACEMENT_GAIN required " plus N instead"; this admits the bare form.
    ['flying, deathtouch\nwhenever an opponent loses life, you gain that much life.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  it.each([
    ['whenever you gain life'],
    ['if you would gain life'],
    ['each time a player gains life'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
