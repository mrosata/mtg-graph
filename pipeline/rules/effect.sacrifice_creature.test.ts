import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_creature';
import type { Card } from '../../shared/types';

function card(types: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: types.join(' '),
    types, subtypes: [], supertypes: [], oracleText,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.sacrifice_creature', () => {
  it.each([
    ['sacrifice a creature'],
    ['sacrifice another creature'],
    ['sacrifice target creature'],
    ['sacrifice three creatures'],
    ['as an additional cost to cast this spell, sacrifice a creature'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a noncreature permanent'],
    ['sacrifice an artifact'],
    ['sacrifice a land'],
    ['destroy target creature'],
    ['exile target creature'],
    // Regression: Faunsbane Troll — "sacrifice an aura attached to this
    // creature" sacrifices the Aura, not the creature. The creature noun
    // appears only as a modifier on the aura.
    ['{1}, sacrifice an aura attached to this creature: this creature fights target creature you don\'t control'],
    ['sacrifice an aura attached to a creature'],
    // v0.14.1 — edict leak. Throne of the Grim Captain back face: "each
    // opponent sacrifices a nonland permanent" is an edict (effect.edict
    // covers it); typed-sacrifice rules must NOT fire on opponent-side sacs.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // Tithing Blade: "each opponent sacrifices a creature" — edict leak.
    ['when this artifact enters, each opponent sacrifices a creature of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito, Fanatic of Aclazotz: "whenever
    // you sacrifice another permanent" is a trigger frame; the card observes
    // sacrifice events rather than performing them.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    ['whenever you sacrifice a creature, draw a card'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue).
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
    // v0.14.31 — "unless they sacrifice" punisher (Polygraph Orb). The
    // opponent loses life UNLESS they pick a forced cost — same edict
    // semantic as the "may X or sacrifice" punisher; the controller never
    // sacrifices anything.
    ['each opponent loses 3 life unless they discard a card or sacrifice a creature.'],
    ['target opponent loses 4 life unless they sacrifice a creature.'],
    // v0.22.0 — Sporogenic Infection: "target player sacrifices a creature
    // of their choice". `target player` belongs in the NEGATIVE_EDICT span
    // alongside `target opponent` / `each opponent` — same edict semantic.
    ['enchant creature when this aura enters, target player sacrifices a creature of their choice other than enchanted creature.'],
    ['target player sacrifices a creature of their choice.'],
    // v0.14.24 negative: "sacrifice it" with NO creature-card antecedent
    // should not satisfy the temporary-reanimate broadening below.
    ['search your library for an artifact card. put it onto the battlefield. sacrifice it.'],
    // Bare "sacrifice them" with no creature-card antecedent — the anaphor
    // could refer to anything; without the antecedent gate this would FP.
    ['choose two target lands. sacrifice them.'],
    // Regression (Vein Ripper): Ward—Sacrifice cost is paid by the OPPONENT
    // targeting this card, not by the controller. The controller never
    // sacrifices anything via Ward; pairing with aristocrats payoffs would
    // mislead deckbuilders. Same exclusion shape as edicts / aristocrats
    // triggers — handled via a NEGATIVE_WARD span.
    ['flying ward—sacrifice a creature. whenever a creature dies, target opponent loses 2 life and you gain 2 life.'],
    ['ward—sacrifice a creature.'],
    ['ward—sacrifice another creature, then draw a card.'],
    // Wave-2 Win 6 (2026-06-01 audit) — Pox Plague: the "each player ...,
    // then ..., then sacrifices ... permanents" frame is a multi-clause edict;
    // the verb is separated from "each player" by intermediate clauses
    // ("loses life", "discards"). NEGATIVE_EDICT must span those.
    ['each player loses half their life, then discards half the cards in their hand, then sacrifices half the permanents they control of their choice. round down each time.'],
    // Wave-2 Win 6 (Zodiark, Umbral God) — observer trigger frame: a third
    // party ("a player") performs the sacrifice and this card just watches.
    // Same exclusion semantic as the "whenever you sacrifice" frame.
    ['whenever a player sacrifices another creature, put a +1/+1 counter on __self__.'],
    ['whenever an opponent sacrifices a creature, draw a card.'],
    ['whenever any player sacrifices a creature, you gain 1 life.'],
    // Wave-2 / FIX 2 (FP-4) — Desecration Demon: "any opponent may sacrifice a
    // creature of their choice. if a player does, tap __self__ and put a
    // +1/+1 counter on it." `any opponent may sacrifice` is an edict-shape
    // forced choice on the opponent, NOT a controller sacrifice. Same
    // exclusion semantic as `each opponent may` / `target opponent may`.
    ['at the beginning of each combat, any opponent may sacrifice a creature of their choice. if a player does, tap __self__ and put a +1/+1 counter on it.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // v0.14.24 — temporary-reanimate "sacrifice them/it" anaphor. Push // Pull
  // and the broader Persist / Embalm-adjacent reanimate-then-sacrifice family
  // all use this shape: reanimate "creature card(s)" earlier in the text, then
  // schedule a sacrifice of the bound anaphor at end of turn. The "creature
  // card" antecedent gates the anaphor so non-creature "sacrifice it"
  // contexts (artifact reanimation, etc.) don't FP.
  it.each([
    ['put up to two target creature cards from a single graveyard onto the battlefield under your control. they gain haste until end of turn. sacrifice them at the beginning of the next end step.'],
    ['return target creature card from your graveyard to the battlefield. sacrifice it at the beginning of the next end step.'],
  ])('matches anaphoric temporary-reanimate sacrifice: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Regression (Rotisserie Elemental): self-sacrifice via pronoun "it" on a
  // Creature card. Type-gated via matchCard so non-Creature contexts (Public
  // Thoroughfare's land self-sac, etc.) don't FP.
  it.each([
    'menace whenever __self__ deals combat damage to a player, put a skewer counter on __self__. then you may sacrifice it.',
    'whenever __self__ attacks, you may have it get +4/+0 until end of turn. if you do, sacrifice it at the beginning of the next end step.',
  ])('matchCard fires for self-sacrifice "sacrifice it" on Creature: %s', (text) => {
    expect(rule.matchCard!(card(['Creature'], text), text)).toBeTruthy();
  });

  it('matchCard does NOT fire for "sacrifice it" on a Land (Public Thoroughfare)', () => {
    const text = 'this land enters tapped. when this land enters, sacrifice it unless you tap an untapped artifact or land you control.';
    expect(rule.matchCard!(card(['Land'], text), text)).toBe(false);
  });

  // v0.13.1 broadening: creature-token sacrifice by token-creature-subtype.
  // When the SAME card creates a creature token of type X earlier in its text
  // and later says "sacrifice (...) X(s)", treat that as a creature sacrifice.
  // The Apprentice's Folly is the canonical case: creates a Reflection token in
  // I/II, then "Sacrifice all Reflections you control" in III.
  describe('token-subtype sacrifice (v0.13.1)', () => {
    it.each([
      // Apprentice's Folly: subtype declared via "is a X in addition to"
      [
        'choose target nontoken creature you control. create a token that\'s a copy of it, except it isn\'t legendary, is a reflection in addition to its other types, and has haste. sacrifice all reflections you control.',
      ],
      // Spirit token + sac
      [
        'create a 1/1 white spirit creature token. sacrifice a spirit: draw a card.',
      ],
      // Saproling token + sac
      [
        'create three 1/1 green saproling creature tokens. {2}, sacrifice a saproling: add one mana of any color.',
      ],
    ])('matches token-subtype sac: %s', (text) => {
      expect(rule.match!(text)).toBeTruthy();
    });

    it.each([
      // Mentions sacrifice of a tribal noun WITHOUT having created such a token.
      // Plague-Engineer-style hate-bear (or any creature-type reference without
      // token creation) should NOT fire this broadening.
      ['sacrifice a goblin: this creature deals 1 damage to any target.'],
      // Sacrifices the named subtype but no creation clause anywhere.
      ['at the beginning of your end step, sacrifice a reflection.'],
    ])('does NOT match without same-card token creation: %s', (text) => {
      expect(rule.match!(text)).toBe(false);
    });

    // v0.43.0 — Sub-fix 6b: "artifact creature token" must not leak "artifact"
    // as a token subtype. Castle Doom shape: creates an artifact creature token
    // and then says "sacrifice an artifact" — the TYPE_WORDS filter prevents
    // "artifact" from being added to collectTokenSubtypes.
    it('does NOT match when token type word is a permanent-type noun (Sub-fix 6b)', () => {
      const text = 'create a 1/1 colorless artifact creature token. sacrifice an artifact: draw a card.';
      expect(rule.match!(text)).toBe(false);
    });
  });

  // v0.43.0 — Sub-fix 6a: tighter REANIMATE_VERB gate. Robot Domination shape:
  // "whenever one or more creature cards are put into your graveyard, sacrifice it"
  // has "creature cards" in a TRIGGER CONDITION, not a reanimate clause — must
  // not match because no reanimate verb precedes the "creature card(s)" mention.
  describe('matchAnaphoricReanimateSac tighter gate (v0.43.0)', () => {
    it('does NOT fire on trigger-condition "creature cards into graveyard, sacrifice it" (no reanimate verb)', () => {
      const text = 'whenever one or more creature cards are put into your graveyard, sacrifice it.';
      expect(rule.match!(text)).toBe(false);
    });

    // Positive that must still match: a legitimate reanimate-then-sac frame.
    it('DOES fire on reanimate-then-sac frame (REANIMATE_VERB present)', () => {
      const text = 'put target creature card from your graveyard onto the battlefield. sacrifice it at the beginning of the next end step.';
      expect(rule.match!(text)).toBeTruthy();
    });
  });
});
