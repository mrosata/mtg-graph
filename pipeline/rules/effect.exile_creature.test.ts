import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_creature';

describe('effect.exile_creature', () => {
  it.each([
    ['exile target creature'],
    ['exile target attacking creature'],
    ['exile all creatures'],
    ['exile each creature with mana value 3 or less'],
    // Replacement form
    ['if a creature would die, exile it instead'],
    ['if that creature would die this turn, exile it instead'],
    // Broad / qualified-broad including creature
    ['exile target permanent'],
    ['exile target nonland permanent'],
    // Regression: Cooped Up — Aura-frame activated exile.
    ['{2}{w}: exile enchanted creature'],
    ['exile enchanted creature'],
    ['exile equipped creature'],
    // Regression (Werefox Bodyguard): "up to one other target" — determiner
    // includes "other" between "up to N" and "target".
    ['exile up to one other target non-fox creature until __self__ leaves the battlefield'],
    ['exile another target creature you control'],
    // 2026-06-01 audit batch — Strategic Betrayal: forced-edict-via-exile.
    // The opponent must exile one of their own creatures. Parallels the
    // effect.edict template "target opponent sacrifices a creature".
    ['target opponent exiles a creature they control and their graveyard.'],
    // v0.35.0 — Batch 16: End of the Hunt. Forced-edict with "creature or
    // planeswalker" disjunction — the creature branch should fire the
    // exile-creature axis.
    ['target opponent exiles a creature or planeswalker they control with the greatest mana value among creatures and planeswalkers they control.'],
    // 2026-06-02 audit batch — Mysterio, Master of Illusion: token-creator
    // with delayed "exile those tokens" clean-up. Antecedent is `create …
    // creature token` in the prior sentence; anaphor is `exile those tokens`.
    ['when __self__ enters, create a 3/3 blue illusion villain creature token for each nontoken villain you control. exile those tokens when __self__ leaves the battlefield.'],
    // HIGH-8 (Morningtide's Light): "exile any number of target creatures".
    ["exile any number of target creatures."],
    // HIGH-8 (Yangchen Saga II): "each player chooses up to one permanent ... exile those permanents".
    ['each player chooses up to one permanent with mana value 3 or greater from among permanents your opponents control. exile those permanents.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Anaphoric "exile it" where "it" refers to a prior "target creature" antecedent.
  it.each([
    // Agrus Kos, Spirit of Justice — conditional exile of suspected creature
    ['whenever __self__ enters or attacks, choose up to one target creature. if it\'s suspected, exile it. otherwise, suspect it.'],
    // Generic conditional exile after target creature
    ['choose a target creature. if it has flying, exile it.'],
    // Attacking creature conditional exile
    ['whenever target creature attacks, exile it'],
    // v0.23 — Turncoat Kunoichi: anaphoric "exile that creature" referring to
    // a prior "target creature" antecedent.
    ['when this creature enters, choose target creature an opponent controls. exile that creature until this creature leaves the battlefield.'],
    // v0.14.9 — Regression (Illicit Masquerade): "dies, exile it" trigger-
    // effect frame. The creature has just died; the trigger exiles it from
    // the graveyard, permanently removing it from the game. Functionally a
    // creature-removal effect for graph-edge purposes.
    ['whenever a creature you control with an impostor counter on it dies, exile it. return up to one other target creature card from your graveyard to the battlefield.'],
    ['when a creature you control dies, exile it'],
    // v0.21.0 — anaphoric "you may exile it" with combat-verb antecedent
    // ("a creature you control attacks/becomes blocked/enters/deals damage,
    // you may exile it"). Bare form (no impulse-recast or flicker tail) is
    // permanent removal — fires exile_creature.
    ['whenever a creature you control attacks, you may exile it.'],
    ['whenever a creature you control deals damage to a player, you may exile it.'],
    // 2026-06-01 audit Group 19 — Coalstoke Gearhulk: ETB reanimates a
    // creature, then at end step exiles it. The "exile that creature" sits
    // 2 sentences after the "target creature card" antecedent (a pump-clause
    // intermediate sentence). PATTERN_ANAPHORIC needs to allow ONE
    // intermediate sentence between antecedent and "exile that creature".
    ['put target creature card with mana value 4 or less from a graveyard onto the battlefield under your control with a finality counter on it. that creature gains menace, deathtouch, and haste. at the beginning of your next end step, exile that creature.'],
  ])('anaphoric exile-it: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target noncreature permanent'],
    ['exile target artifact'],
    ['exile target enchantment'],
    ['destroy target creature'],
    ['return target creature to its owner\'s hand'],
    // Regression (Abuelo, Ancestral Echo): "exile … Return it to the battlefield"
    // is a flicker (bounce/blink axis), not removal. effect.bounce_creature covers it.
    ['{1}{w}{u}: exile another target creature or artifact you control. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
    ['exile target creature. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
    ['exile target creature, then return it to the battlefield under its owner\'s control'],
    // Anaphoric negatives — no "target creature" antecedent
    // Exile from graveyard, not battlefield removal
    ['choose a creature. exile it from your graveyard.'],
    // Exile of a hand card, not a creature on the battlefield
    ['target player exiles a card from their hand. they may play it this turn.'],
    // "exile it" with no preceding target creature antecedent
    ['if it has flying, you may exile it'],
    // v0.21.0 — Norin, Swift Survivalist: anaphoric "you may exile it"
    // with combat-verb antecedent + impulse-recast tail. The exile is
    // followed by "play that card from exile this turn", which is impulse-
    // recast (not removal). Must NOT fire exile_creature.
    ['__self__ can\'t block. whenever a creature you control becomes blocked, you may exile it. you may play that card from exile this turn.'],
    ['whenever a creature you control attacks, you may exile it. you may play that card from exile this turn.'],
    // 2026-06-02 audit batch — Superior Foes of Spider-Man: "exile another
    // card with __self__" is impulse-recast bookkeeping ("you may play
    // that card until you exile another card with this creature") — the
    // "exile" is removing an impulse from the side area, not a battlefield
    // creature. The 6-token filler in PATTERN_OWN was consuming "card with
    // this " before reaching "creature".
    ['trample whenever you cast a spell with mana value 4 or greater, you may exile the top card of your library. if you do, you may play that card until you exile another card with this creature.'],
    ['you may play that card until you exile another card with this creature'],
    ['you may play that card until you exile a card with __self__'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // FIX 8 (BR-3) — Abyssal Harvester: "exile all other Nightmare tokens you
  // control". Token-sweep on a creature subtype is a creature exile by token
  // type. Gated on THEME_TRIBES alternation so artifact-token sweeps
  // (Treasure / Food / Clue / Map) don't FP.
  it.each([
    ["{t}: exile target creature card from a graveyard that was put there this turn. create a token that's a copy of it, except it's a nightmare in addition to its other types. then exile all other nightmare tokens you control."],
  ])('matches token-subtype sweep: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Regression (Unyielding Gatekeeper): "exile another target nonland
  // permanent. if you controlled it, return it to the battlefield tapped.
  // otherwise, ..." — split-mode punisher, NOT a flicker. The "if you
  // controlled it" preamble gates the return on ownership; for opponent-
  // controlled targets the card is removal-with-replacement. The FLICKER_TAIL
  // suppressor must not fire when the return is conditioned on "if you
  // controlled it".
  it.each([
    ['when this creature is turned face up, exile another target nonland permanent. if you controlled it, return it to the battlefield tapped. otherwise, its controller creates a 2/2 white and blue detective creature token.'],
    ['exile target creature. if you controlled it, return it to the battlefield at the beginning of the next end step.'],
  ])('matches conditional split-mode exile (if-you-controlled-it preamble): %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });
});
