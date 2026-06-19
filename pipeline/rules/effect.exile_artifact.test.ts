import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_artifact';

describe('effect.exile_artifact', () => {
  it.each([
    ['exile target artifact'],
    ['exile all artifacts'],
    ['exile target artifact or enchantment'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
    // v0.14.1 — Vehicle synonym. Vehicle is a creature/artifact-subtype that
    // is always an artifact (CR 205.3g). Ray of Ruin: "Exile target creature,
    // Vehicle, or nonbasic land" should fire exile_artifact.
    ['exile target creature, vehicle, or nonbasic land'],
    ['exile target vehicle'],
    // Artifact subtypes are always artifacts (CR 301.5b). Equipment/Food/
    // Treasure/Clue/Map/Powerstone are all unambiguously artifact subtypes.
    // Fiery Annihilation: "Exile up to one target Equipment attached to that creature."
    ['exile up to one target equipment attached to that creature'],
    ['exile target treasure'],
    ['exile target food you control'],
    ['exile target clue'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonartifact permanent'],
    ['exile target creature'],
    ['exile target artifact card from a graveyard'],
    ['destroy target artifact'],
    // Regression (Abuelo, Ancestral Echo): "exile … Return it to the battlefield"
    // is a flicker (bounce/blink axis), not removal. effect.bounce_artifact covers it.
    ['{1}{w}{u}: exile another target creature or artifact you control. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
    ['exile target artifact. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
    // v0.43.0 — Thor FP: "exile target equipment, instant, or sorcery card from
    // your graveyard" is graveyard-zone removal (effect.cast_from_exile territory),
    // not battlefield artifact removal. GRAVEYARD_TAIL guard must suppress it.
    ['exile target equipment, instant, or sorcery card from your graveyard.'],
    // Fix D — The Mighty Thor shape: "exile up to one target nontoken artifact
    // or creature, then return that card to the battlefield." The "that card"
    // pronoun now in FLICKER_TAIL must suppress artifact exile.
    ['exile up to one target nontoken artifact or creature, then return that card to the battlefield.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression (Unyielding Gatekeeper): "exile another target nonland
  // permanent. if you controlled it, return it to the battlefield tapped."
  // — split-mode punisher, NOT a flicker. The "if you controlled it"
  // preamble gates the return on ownership; for opponent-controlled targets
  // the card is removal-with-replacement. The FLICKER_TAIL suppressor must
  // not fire when the return is conditioned on "if you controlled it".
  it.each([
    ['when this creature is turned face up, exile another target nonland permanent. if you controlled it, return it to the battlefield tapped. otherwise, its controller creates a 2/2 white and blue detective creature token.'],
    ['exile target artifact. if you controlled it, return it to the battlefield at the beginning of the next end step.'],
  ])('matches conditional split-mode exile (if-you-controlled-it preamble): %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });
});
