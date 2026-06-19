import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_enchantment';

describe('effect.exile_enchantment', () => {
  it.each([
    ['exile target enchantment'],
    ['exile all enchantments'],
    ['exile target artifact or enchantment'],
    ['exile target permanent'],
    ['exile target nonland permanent'],
    ['exile target noncreature permanent'],
    // Early Winter — opponent-edict-exile. "Target opponent exiles an
    // enchantment they control" is the edict frame (controller doesn't pick
    // the target; opponent chooses one to exile). Same removal class as
    // direct "exile target enchantment".
    ['target opponent exiles an enchantment they control'],
    ['target player exiles an enchantment'],
    ['target opponent exiles a creature, an artifact, or an enchantment they control'],
    // Protector of the Wastes / Angel of the Ruins — "and/or" conjunction in
    // the filler between determiners and "enchantments". The `/` in "and/or"
    // was previously treated as a filler-aborting character.
    ['exile up to two target artifacts and/or enchantments.'],
    ['exile up to two target artifacts and/or enchantments controlled by different players.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target nonenchantment permanent'],
    ['exile target creature'],
    ['exile target enchantment card from a graveyard'],
    ['destroy target enchantment'],
    // Regression: Food Coma — "exile target creature an opponent controls
    // until this enchantment leaves the battlefield" — the target is a
    // creature; "enchantment" is a duration anchor (Banishing-Light pattern).
    ['exile target creature an opponent controls until this enchantment leaves the battlefield'],
    ['exile target artifact until this enchantment leaves the battlefield'],
    // Fix D — blink-frame: "exile target enchantment, then return that card
    // to the battlefield." FLICKER_TAIL must suppress enchantment exile.
    ['exile target enchantment you control, then return that card to the battlefield.'],
    ['exile target enchantment. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
