// pipeline/rules/trigger.another_creature_etb.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './trigger.another_creature_etb';

describe('trigger.another_creature_etb', () => {
  it.each([
    ['whenever a creature enters, draw a card'],
    ['whenever another creature you control enters'],
    ['whenever a creature you control enters the battlefield, gain 1 life'],
    // Regression: Extraordinary Journey — plural "one or more (nontoken)?
    // creatures enter" form. The trigger fires when ANY creature ETBs; the
    // plural quantifier is a "this ability triggers only once each turn"
    // dedupe, not a semantic change.
    ['whenever one or more nontoken creatures enter, you draw a card'],
    ['whenever one or more creatures you control enter the battlefield'],
    // Regression (Lord Skitter, Sewer King; Obyra, Dreaming Duelist): tribal
    // "another <Tribe>" frame — names a creature type instead of "creature".
    ['whenever another rat you control enters, exile up to one target card from an opponent\'s graveyard'],
    ['whenever another faerie you control enters, each opponent loses 1 life'],
    // Regression (The Irencrag): adjective between quantifier and "creature".
    ['whenever a legendary creature you control enters, you may have __self__ become a legendary equipment'],
    // Other common adjective-before-creature forms.
    ['whenever a nontoken creature you control enters, draw a card'],
    // v0.14.6 — tribal-restricted with "a" determiner (Case of the Pilfered
    // Proof): "whenever a Detective you control enters". Same tribal-ETB
    // axis as "another Detective"; "a" is the indefinite form.
    ['whenever a detective you control enters or is turned face up, put a +1/+1 counter on it'],
    ['whenever a goblin you control enters, deal 1 damage to any target'],
    // v0.14.20 — compound subject "this X or another Y" (Projektor Inspector).
    // The other-half of the disjunction ("another Detective you control") is
    // a tribal-ETB shape that should fire trigger.another_creature_etb. The
    // self-half fires trigger.self_etb separately.
    ['whenever this creature or another detective you control enters and whenever a detective you control is turned face up, you may draw a card'],
    // Generic-creature compound: "this creature or another creature you control enters"
    ['whenever this creature or another creature you control enters, draw a card'],
    // v0.14.13 — intervening "with <stat-filter>" qualifier between "you
    // control" and "enters". Marketwatch Phantom, Neighborhood Guardian.
    // The qualifier slot must accept "with power N or less" / "with power N
    // or greater" / "with mana value N or less" tails (5-7 words after
    // "creature" before "enters").
    ['whenever another creature you control with power 2 or less enters, this creature gains flying until end of turn'],
    ['whenever another creature you control with power 2 or less enters, target creature you control gets +1/+1 until end of turn'],
    ['whenever another creature you control with power 3 or greater enters, draw a card'],
    ['whenever another creature you control with mana value 4 or less enters, scry 1'],
    ['whenever a nontoken creature you control with power 2 or less enters, gain 1 life'],
    // v0.15 — compound subject with intervening "with <stat-filter>" qualifier
    // (Vaultborn Tyrant). Other-half slot widened from 40 to 80 chars.
    ['whenever this creature or another creature you control with power 4 or greater enters, you gain 3 life and draw a card'],
    // Clement, the Worrywort — compound leading subject is __self__ (legendary
    // name rewritten to __self__ during normalization) rather than "this creature".
    ['whenever __self__ or another creature you control enters, return up to one target creature you control with lesser mana value to its owner\'s hand'],
    // Honored Dreyleader — tribal arm disjunctive subject "<tribe> or <subtype>".
    // Both halves trigger an ETB payoff (Squirrel half is tribal-ETB).
    ['whenever another squirrel or food you control enters, put a +1/+1 counter on this creature'],
    // Knightfisher — tribal arm with pre-tribe adjective ("nontoken Bird").
    ['whenever another nontoken bird you control enters, create a 1/1 blue fish creature token'],
    // v0.20.0 — multi-tribe comma list with "or"/"and/or" conjunction.
    // Valley Mightcaller — "another frog, rabbit, raccoon, or squirrel".
    ['trample whenever another frog, rabbit, raccoon, or squirrel you control enters, put a +1/+1 counter on this creature.'],
    // Valley Questcaller — "one or more other rabbits, bats, birds, and/or mice"
    // (plural tribes, "one or more other" determiner, plural verb "enter").
    ['whenever one or more other rabbits, bats, birds, and/or mice you control enter, scry 1. other rabbits, bats, birds, and mice you control get +1/+1.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['when __self__ enters, scry 2'],
    ['draw a card'],
    ['__self__ enters with a +1/+1 counter'],
    // The new tribal arm must NOT fire on other permanent-type ETBs — those
    // have their own trigger.another_<type>_etb tags.
    ['whenever another artifact you control enters, draw a card'],
    ['whenever another enchantment you control enters, scry 1'],
    ['whenever another land you control enters, gain 1 life'],
    // Regression (v0.14.1): self-ETB leak. "Whenever this creature enters" is
    // a self-trigger; trigger.self_etb covers it, so this rule must NOT fire.
    // Cards: Queen's Bay Paladin, Sentinel of the Nameless City, Threefold
    // Thunderhulk, Visage of Dread back face.
    ['whenever this creature enters or attacks, return up to one target vampire card from your graveyard to the battlefield with a finality counter on it'],
    ['vigilance whenever this creature enters or attacks, create a map token'],
    ['whenever this creature enters or attacks, create a number of 1/1 colorless gnome artifact creature tokens equal to its power'],
    ['menace whenever this creature enters or attacks, you may mill two cards'],
    // v0.14.13 guard — the bumped post-creature qualifier window must not
    // bridge an unrelated clause with a stray "enters" later in the text.
    // Hypothetical but plausible attack/etb crosstalk.
    ['whenever another creature attacks, the next creature that enters does so tapped'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
