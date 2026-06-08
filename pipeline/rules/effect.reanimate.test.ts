import { describe, it, expect } from 'vitest';
import { rule } from './effect.reanimate';

describe('effect.reanimate', () => {
  it.each([
    ['return target creature card from a graveyard to the battlefield'],
    ['return target creature card from your graveyard to the battlefield'],
    ['return target card from a graveyard to the battlefield'],
    ['return a creature card that was in a graveyard to the battlefield'],
    // mass reanimate (Bringer of the Last Gift)
    ["each player returns all creature cards from their graveyard that weren't put there this way to the battlefield"],
    // plural-object variants
    ['return all creature cards from your graveyard to the battlefield'],
    // opponent's graveyard
    ["return target creature card from an opponent's graveyard to the battlefield"],
    // "any graveyard"
    ['return target creature card from any graveyard to the battlefield'],
    // Regression (Return Triumphant): modifiers between "card" and "from"
    // ("with mana value 3 or less", "with power 3 or less", etc.)
    ['return target creature card with mana value 3 or less from your graveyard to the battlefield'],
    ['return target creature card with power 2 or less from your graveyard to the battlefield'],
    // Regression (Virtue of Persistence): "put ... onto the battlefield" form
    // (verb `put` instead of `return`, preposition `onto` instead of `to`).
    // The canonical reanimator phrasing on many staples and saga abilities.
    ['put target creature card from a graveyard onto the battlefield under your control'],
    ['put target creature card from your graveyard onto the battlefield'],
    // v0.12.9 — modal reanimation following a return-to-hand clause
    // (Back for Seconds). Cards being put-to-battlefield were just named as
    // "those cards" in the prior sentence about returning from graveyard.
    ['return up to two target creature cards from your graveyard to your hand. if this spell was bargained, you may put one of those cards with mana value 4 or less onto the battlefield instead of putting it into your hand'],
    // v0.12.9 — mill-and-recur (Bramble Familiar // Fetch Quest, also Beluna
    // Grandsquall variants). Cards are in graveyard immediately after the
    // mill, so "from among the milled cards onto the battlefield" is a
    // reanimation effect.
    ['mill seven cards. then put a creature, enchantment, or land card from among the milled cards onto the battlefield'],
    ['mill four cards. then put a creature card from among the milled cards onto the battlefield'],
    // v0.14.1 — reversed-clause order. Squirming Emergence: "return to the
    // battlefield target nonland permanent card in your graveyard ...".
    ['return to the battlefield target nonland permanent card in your graveyard with mana value less than or equal to the number of permanent cards in your graveyard'],
    ['put onto the battlefield target creature card in your graveyard'],
    // v0.18 — anaphoric "return that card to the battlefield" after a
    // graveyard-source antecedent (Shepherd of the Clouds) or after a
    // dies-trigger antecedent (Vraska, the Silencer). The "that card"
    // refers back to the graveyard-derived antecedent across a sentence
    // boundary.
    ['return target permanent card with mana value 3 or less from your graveyard to your hand. return that card to the battlefield instead if you control a mount'],
    ['whenever a nontoken creature an opponent controls dies, you may pay {1}. if you do, return that card to the battlefield tapped under your control'],
    // v0.20 — "return a creature card put into <your> graveyard this way to
    // the battlefield" (Starfall Invocation). The card was milled/wiped to
    // graveyard earlier in the same effect; "this way" binds back to that.
    ['destroy all creatures. if the gift was promised, return a creature card put into your graveyard this way to the battlefield under your control'],
    // 2026-06-01 audit Group 11 — Daretti, Rocketeer Engineer: "choose target
    // <type> card in <X>'s graveyard. ... return the chosen card to the
    // battlefield". The "the chosen card" anaphor binds back to the prior
    // "choose target ... card in ... graveyard" antecedent — new dedicated
    // arm since the existing patterns require "from graveyard" or "those
    // cards" anaphors.
    ['whenever __self__ enters or attacks, choose target artifact card in your graveyard. you may sacrifice an artifact. if you do, return the chosen card to the battlefield.'],
    // HIGH-6 (Zuko's Conviction): "return ... from your graveyard to your hand. if this spell was kicked, instead put that card onto the battlefield tapped."
    ['return target creature card from your graveyard to your hand. if this spell was kicked, instead put that card onto the battlefield tapped.'],
    // HIGH-6 (Brilliance Unleashed): "choose target artifact card in your graveyard. return it to the battlefield..."
    ["choose target artifact card in your graveyard. return it to the battlefield if it's an artifact creature card. otherwise, return it to the battlefield and it's a 3/3 robot artifact creature with flying."],
    // v0.35.0 — Batch 2: mill-then-reanimate with anaphoric "from among them"
    // (Vastlands Scavenger // Bind to Life). The "them" binds back to the
    // immediately-prior "mill N cards" antecedent — same semantic as the
    // existing "from among the milled cards" arm but with a pronoun anaphor.
    ['deathtouch this creature enters prepared. mill seven cards. then put a creature card from among them onto the battlefield.'],
    // v0.39.0 — 200-card audit Ship 11 (Batch 1). Animate Dead: Aura
    // template "enchant creature card in a graveyard ... return enchanted
    // creature card to the battlefield" — the Aura targets a graveyard
    // creature, then returns it. The "enchanted creature card" anaphor
    // binds to the just-targeted graveyard card.
    ["enchant creature card in a graveyard when this aura enters, if it's on the battlefield, it loses   and gains   return enchanted creature card to the battlefield under your control and attach this aura to it. when this aura leaves the battlefield, that creature's controller sacrifices it. enchanted creature gets -1/-0."],
    // Avatar Destiny: mill-then-return anaphor — "return ... up to one
    // creature card milled this way to the battlefield". "Milled this way"
    // binds to a prior mill clause in the same effect.
    ["enchant creature you control enchanted creature gets +1/+1 for each creature card in your graveyard and is an avatar in addition to its other types. when enchanted creature dies, mill cards equal to its power. return this card to its owner's hand and up to one creature card milled this way to the battlefield under your control."],
    // Athreos, Shroud-Veiled: dies-OR-exile bridge — "dies or is put into
    // exile, return that card to the battlefield". The existing dies-arm
    // only accepts "dies,"; broaden to admit "dies or is put into exile,".
    ['indestructible as long as your devotion to white and black is less than seven, __self__ isn\'t a creature. at the beginning of your end step, put a coin counter on another target creature. whenever a creature with a coin counter on it dies or is put into exile, return that card to the battlefield under your control.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  // v0.12.9 — granted self-reanimation triggers (Not Dead After All gives a
  // creature "when this creature dies, return it to the battlefield"). The
  // "it" antecedent is the creature that just died (in graveyard).
  it.each([
    ['until end of turn, target creature you control gains "when this creature dies, return it to the battlefield tapped under its owner\'s control, then create a wicked role token attached to it."'],
    ['when this creature dies, return it to the battlefield under its owner\'s control'],
    // v0.20.0 — Enduring cycle (Enduring Courage / Curiosity / Innocence /
    // Tenacity / Vitality): "when __self__ dies, if it was a creature,
    // return it to the battlefield ..." The "if it was a creature"
    // interpolation between "dies," and "return it" must be admitted.
    ["whenever another creature you control enters, it gets +2/+0 and gains haste until end of turn. when __self__ dies, if it was a creature, return it to the battlefield under its owner's control. it's an enchantment."],
    // v0.20.0 — Come Back Wrong: anaphoric "if a creature card is put into
    // a graveyard this way, return it to the battlefield".
    ['destroy target creature. if a creature card is put into a graveyard this way, return it to the battlefield under your control. sacrifice it at the beginning of your next end step.'],
    // v0.21.0 — Meathook Massacre II: dies-trigger → "return that card under
    // your control with a finality counter on it". Destination is "under
    // <X>'s control" (not "to the battlefield"), separated by a "pay 3 life"
    // intermediate sentence. The anaphoric pattern bridges the period.
    ['whenever a creature you control dies, you may pay 3 life. if you do, return that card under your control with a finality counter on it.'],
    ['whenever a creature an opponent controls dies, they may pay 3 life. if they don\'t, return that card under your control with a finality counter on it.'],
    // v0.22.0 — Unstoppable Slasher: "when this creature dies, if it had no
    // counters on it, return it to the battlefield tapped under its owner's
    // control..." The "if it had no counters on it" interpolation between
    // "dies," and "return it" needs a broader filler than the v0.20 cycle's
    // "if it was a creature".
    ["deathtouch whenever this creature deals combat damage to a player, they lose half their life, rounded up. when this creature dies, if it had no counters on it, return it to the battlefield tapped under its owner's control with two stun counters on it."],
    // 2026-06-01 audit Group 11 — Valkyrie's Call: "dies, return that card to
    // the battlefield..." The dies-arm currently misses `that card` (only
    // `it` / `that creature` / `them` are admitted). Adding `that card` to
    // the pronoun alternation.
    ["whenever a nontoken, non-angel creature you control dies, return that card to the battlefield under its owner's control with a +1/+1 counter on it"],
  ])('matches granted dies-then-reanimate triggers: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  // v0.21.0 — Hedge Shredder: mill-trigger → "one or more land cards are put
  // into your graveyard from your library, put them onto the battlefield
  // tapped". The mill (well, library→graveyard via crew) creates the
  // graveyard contents; "put them onto the battlefield" reanimates them.
  it.each([
    ['whenever this vehicle attacks, you may mill two cards. whenever one or more land cards are put into your graveyard from your library, put them onto the battlefield tapped.'],
    ['whenever one or more creature cards are put into your graveyard from your library, put them onto the battlefield.'],
  ])('matches mill-trigger reanimation: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  // v0.14.x — search-graveyard-as-source variant (Agency Outfitter). The card
  // searches the graveyard (among other zones) and puts cards from there onto
  // the battlefield. The graveyard must be listed as one of the searched zones.
  it.each([
    // Agency Outfitter: "search your graveyard, hand and/or library for a card
    // named X ... and put them onto the battlefield"
    ['you may search your graveyard, hand and/or library for a card named magnifying glass and/or a card named thinking cap and put them onto the battlefield'],
    // Simpler graveyard-first search variant
    ['search your graveyard and/or library for a creature card and put it onto the battlefield'],
    // Graveyard trailing in a multi-zone search
    ['search your library and/or graveyard for a creature card and put it onto the battlefield'],
  ])('matches search-graveyard-as-source: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ["return target creature to its owner's hand"],
    ['return target permanent to the battlefield'],
    // recursion-to-hand must not be confused with reanimation (P1.3 axis)
    ['return target creature card from your graveyard to your hand'],
    // unrelated graveyard mention with a battlefield-return token
    ['whenever a card is put into a graveyard, return target creature token to the battlefield'],
    // tutor only — no graveyard as search zone
    ['search your library for a creature card and put it onto the battlefield'],
    // return-to-hand from graveyard — not a battlefield effect
    ["return target creature card from your graveyard to its owner's hand"],
    // search library for land — no graveyard, no battlefield put
    ['search your library for a basic land card and put it onto the battlefield tapped'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
