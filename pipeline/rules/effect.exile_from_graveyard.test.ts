import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_from_graveyard';

describe('effect.exile_from_graveyard', () => {
  it.each([
    // Targeted graveyard-hate, foreign-graveyard form.
    ['exile target card from a graveyard'],
    ['exile target creature card from a graveyard'],
    ["exile target card from target opponent's graveyard"],
    // Regression (Lord Skitter, Sewer King): "from an opponent's graveyard"
    // (indefinite "an" rather than "target") — surrogate for exile-each.
    ["exile up to one target card from an opponent's graveyard"],
    // "from your graveyard" only counts as an effect when `target` qualifies it.
    ['exile up to two target cards from your graveyard'],
    ['exile target nonland card with mana value 3 or less from your graveyard'],
    // Regression (Specter of Mortality): "exile one or more X cards from your
    // graveyard" — variable-scope graveyard exile that scales an effect by the
    // count chosen. Not a cost form (no colon), so admissible.
    ['you may exile one or more creature cards from your graveyard'],
    // Mass-wipe form (e.g. Soul-Guide Lantern's sacrifice ability).
    ['exile each opponent\'s graveyard'],
    // Regression (Sentinel of Lost Lore): singular "target player's graveyard"
    // (bulk single-graveyard exile).
    ["exile target player's graveyard"],
    // Regression (Digsite Conservator): "from a single graveyard" — targeted
    // multi-card exile that picks one graveyard out of many.
    ['sacrifice this creature: exile up to four target cards from a single graveyard. activate only as a sorcery.'],
    // v0.14.22 — "exile target X card IN a graveyard" — modern templating
    // (Reenact the Crime). Semantically the same as "from a graveyard":
    // the card is the target, the graveyard is the source zone.
    ['exile target nonland card in a graveyard that was put there from anywhere this turn'],
    ['exile target creature card in a graveyard'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target creature'],
    ['exile target artifact from the battlefield'],
    ['exile cards from your hand'],
    // Self-exile activation costs (Renew-style) — paying a cost, not producing
    // a graveyard-hate effect another card can interact with.
    ['{1}{g}, exile __self__ from your graveyard: search your library for a desert card.'],
    ['renew — {1}{g}, exile __self__ from your graveyard: put a +1/+1 counter on target creature.'],
    ['{5}, exile __self__ from your graveyard: discover 5.'],
    // Generic untargeted cost-form on the activator's own graveyard.
    ['{t}, exile a card from your graveyard: add one mana of any color.'],
    ['exile two cards from your graveyard: draw a card.'],
    // Regression (Fabrication Foundry): OWN_QUANTIFIED used to span across
    // the colon — "exile one or more other artifacts you control with total
    // mana value x: return target artifact card with mana value x or less
    // from your graveyard". The forbid-colon filler prevents this; the cost
    // half has no "from your graveyard", the effect half is reanimation.
    ['{2}{w}, {t}, exile one or more other artifacts you control with total mana value x: return target artifact card with mana value x or less from your graveyard to the battlefield. activate only as a sorcery.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
