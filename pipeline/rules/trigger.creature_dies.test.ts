// pipeline/rules/trigger.creature_dies.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.creature_dies';

describe('trigger.creature_dies', () => {
  it.each([
    ['whenever a creature dies'],
    ['whenever another creature you control dies'],
    // Regression: Fell Horseman — self-dies form. "When this creature dies"
    // and "when __self__ dies" are dying-ability triggers that should
    // participate in the death-trigger axis.
    ['when this creature dies, put it on the bottom of its owner\'s library'],
    ['when __self__ dies, return it to your hand'],
    ['whenever this creature dies'],
    // Adjective + qualifier filler — Gnawing Crescendo, Aristocrats-style
    ['whenever a nontoken creature you control dies this turn, create a 1/1 black rat creature token'],
    ['whenever a creature an opponent controls dies, draw a card'],
    ['whenever a white creature dies, you gain 1 life'],
    ['whenever a tapped creature you control dies'],
    // Regression (Explorer's Cache): "with a +1/+1 counter on it dies" — the
    // "+1/+1" requires the post-creature filler to admit +, /, -.
    ['whenever a creature you control with a +1/+1 counter on it dies, put a +1/+1 counter on this artifact.'],
    // v0.14.1 — plural subject. The Skullspore Nexus: "whenever one or more
    // nontoken creatures you control die".
    ['whenever one or more nontoken creatures you control die, create a green fungus dinosaur creature token'],
    ['whenever one or more creatures die, draw a card'],
    // v0.20.0 — Come Back Wrong: "if a creature card is put into a graveyard
    // this way, return it to the battlefield...". The "this way" anaphor
    // binds to the prior destroy/wipe clause — semantically a death
    // trigger conditioned on the card being a creature.
    ['destroy target creature. if a creature card is put into a graveyard this way, return it to the battlefield under your control. sacrifice it at the beginning of your next end step.'],
    ['if a creature card is put into a graveyard this way, draw a card'],
    ['if a creature card is put into a graveyard from the battlefield, draw a card'],
    // v0.22.0 — Turn Inside Out: anaphoric "when it dies this turn" with a
    // prior "target creature" antecedent. The `this turn` tail keeps the
    // arm bounded — bare "when it dies" would be too generic. Backward
    // 120-char window guard requires `target creature` antecedent.
    ['target creature gets +3/+0 until end of turn. when it dies this turn, manifest dread.'],
    ['target creature gets +2/+2 until end of turn. when it dies this turn, draw a card.'],
    ['target creature gets +1/+0. when that creature dies this turn, create a 2/2 zombie.'],
    // v0.23 — Colfenor's Urn: RAW "is put into your graveyard from the
    // battlefield" templating. Per CR 700.4, semantically a dies trigger.
    ['whenever a creature with toughness 4 or greater is put into your graveyard from the battlefield, you may exile it.'],
    // Variant — RAW with "an opponent's graveyard" qualifier.
    ["whenever a creature is put into an opponent's graveyard from the battlefield, draw a card."],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['destroy target creature'],
    ['exile target creature'],
    // Stays unmatched: not a "dies" trigger.
    ['when this creature enters, scry 2'],
    // v0.22.0 — bare "when it dies this turn" without a `target creature`
    // antecedent must NOT fire (anaphor with nothing to bind to).
    ['when it dies this turn, draw a card.'],
    ['exile target artifact. when it dies this turn, you gain 2 life.'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
