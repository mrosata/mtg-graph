// pipeline/rules/effect.grants_evasion.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.grants_evasion';

describe('effect.grants_evasion', () => {
  it.each([
    // The Archon clause that motivated the split
    ['other creatures you control that are enchanted by auras you control have base power and toughness 4/4 and have flying'],
    // Common phrasings
    ['creatures you control have flying'],
    ['target creature gains flying until end of turn'],
    ['__SELF__ gains menace until end of turn'],
    ['each creature you control has menace'],
    // Token creation
    ['create a 1/1 white spirit creature token with flying'],
    ['create two 2/2 black zombie creature tokens with menace'],
    // Transformation
    ['target creature becomes a 4/4 flying angel'],
    // v0.30 — Group 11c — Pyrewood Gearhulk: chain-through-conjunction.
    // "gain vigilance and menace until end of turn" — menace is the second
    // item in an "and"-list after a non-evasion keyword.
    ['vigilance, menace when this creature enters, other creatures you control get +2/+2 and gain vigilance and menace until end of turn. damage can\'t be prevented this turn.'],
    ['target creature gains haste, vigilance, and menace until end of turn'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pure intrinsic keyword line — handled by has_flying / has_menace, not here
    ['flying'],
    ['flying, vigilance'],
    ['menace'],
    // Cares-about patterns — handled by condition.cares_evasion
    ['creatures with flying you control get +1/+1'],
    ['whenever a creature with flying attacks, draw a card'],
    // Self-conditional patterns — split into `effect.gains_keyword_self_conditional` in v0.14.0
    // Didact Echo: "this creature has flying as long as there are four or more permanent cards in your graveyard"
    ['descend 4 — this creature has flying as long as there are four or more permanent cards in your graveyard.'],
    // __SELF__ (lowercase, post-normalize) self-conditional grant
    ['__self__ has flying as long as you control three or more artifacts.'],
    ['__self__ gains menace while it has a +1/+1 counter on it.'],
    // Unrelated keywords
    ['target creature gains trample'],
    ['creatures you control have lifelink'],
    ['draw a card'],
    // v0.14.1 — manland self-animation must NOT fire grants_evasion (the
    // animation grants the keyword to SELF, not to other creatures/tokens).
    // Cards: Restless Anchorage, Restless Vents.
    ['{1}{w}{u}: until end of turn, this land becomes a 2/3 white and blue bird creature with flying. it\'s still a land.'],
    ['{1}{b}{r}: until end of turn, this land becomes a 2/3 black and red insect creature with menace. it\'s still a land.'],
    // v0.14.2 — "this land becomes a 2/3 elemental creature with menace" self-animation.
    ['{1}{g}: until end of turn, this land becomes a 2/3 elemental creature with menace. it\'s still a land.'],
    // Regression (Warden of the Inner Sky): self-conditional grant via
    // anaphoric "it" — "as long as this creature has [cond], it has flying
    // and vigilance". The grant belongs to gains_keyword_self_conditional;
    // grants_evasion's tagDef explicitly scopes to OTHER creatures.
    ['as long as this creature has three or more counters on it, it has flying and vigilance.'],
    // v0.14.14 — gate-first self-conditional with EXPLICIT self subject (not
    // anaphoric "it"). Living Conundrum: "as long as there are no cards in
    // your library, this creature has base power and toughness 10/10 and has
    // flying and vigilance." The strip must catch "this creature" as the
    // post-comma subject, not just "it".
    ['as long as there are no cards in your library, this creature has base power and toughness 10/10 and has flying and vigilance.'],
    // v0.14.26 — triggered self-buff (Rot Farm Mortipede). "Whenever X,
    // this creature gets +1/+0 and gains menace and lifelink until end of
    // turn." The self subject + "gets" verb need to be picked up by the
    // strip so the trailing "gains menace" doesn't FP as an anthem grant.
    ['whenever one or more creature cards leave your graveyard, this creature gets +1/+0 and gains menace and lifelink until end of turn.'],
    // Variant: "when ..." gate (single-fire trigger).
    ['when this creature attacks, it gets +1/+1 and gains menace until end of turn.'],
    // v0.20 — clone-frame self-anaphor (Mockingbird). "You may have this
    // creature enter as a copy of any creature on the battlefield, except
    // it's a 1/1 bird in addition to its other types and it has flying."
    // The flying belongs to the cloned self, not to a separate creature.
    [`you may have this creature enter as a copy of any creature on the battlefield, except it's a 1/1 bird in addition to its other types and it has flying.`],
    // v0.20.0 — Acrobatic Cheerleader: "if this creature is tapped, put a
    // flying counter on it" — self-conditional keyword-counter grant.
    // Pre-strip removes the entire if/while/when antecedent clause before
    // the keyword-counter pattern runs. The "it" antecedent is self.
    ['survival — at the beginning of your second main phase, if this creature is tapped, put a flying counter on it. this ability triggers only once.'],
    // v0.20.0 — bonus catch (Inventive Wingsmith): "this creature doesn't
    // have a flying counter on it" — self-referential conditional, not a
    // grant. The strip catches the if/while form.
    ['if this creature doesn\'t have a flying counter on it, put a flying counter on it.'],
    // v0.24 — Max speed self-conditional grant (DSK Start Your Engines!).
    // Gastal Raider: "Max speed — This creature gets +1/+1 and has menace."
    // The menace is granted to SELF only while the controller is at max
    // speed — a self-conditional axis, not an anthem. Belongs in
    // gains_keyword_self_conditional, NOT grants_evasion.
    ['max speed — this creature gets +1/+1 and has menace.'],
    ['max speed — __self__ has menace.'],
    ['max speed — this creature has flying.'],
    // FIX 5 (FP-8) — Elenda, Saint of Dusk: "as long as your life total is
    // greater than your starting life total, __self__ gets +1/+1 and has
    // menace." The menace is gated on a self-conditional life-total
    // comparison; that's gains_keyword_self_conditional territory, NOT a
    // grants/anthem. The strip needed to accept the `gets` verb in the post-
    // comma subject slot (currently only handles `has/have/gains`).
    ['lifelink, hexproof from instants\nas long as your life total is greater than your starting life total, __self__ gets +1/+1 and has menace. __self__ gets an additional +5/+5 as long as your life total is at least 10 greater than your starting life total.'],
    // 2026-06-01 follow-up — Sarkhan, Dragon Ascendant. "Until end of turn,
    // __self__ becomes a Dragon in addition to its other types and gains
    // flying." Self-conditional flying — the flying belongs to SELF (the
    // newly-typed Dragon), not to other creatures. Belongs in
    // effect.gains_keyword_self_conditional, NOT grants_evasion. Per v0.21
    // policy: stripping the "becomes-X-and-gains-evasion" self-conditional
    // is safe because the companion tag exists for evasion only.
    ['when __self__ enters, you may behold a dragon. if you do, create a treasure token. whenever a dragon you control enters, put a +1/+1 counter on __self__. until end of turn, __self__ becomes a dragon in addition to its other types and gains flying.'],
    // Variant subjects within the same becomes-and-gains-evasion frame.
    ['until end of turn, this creature becomes a dragon and gains flying.'],
    ['until end of turn, __self__ becomes a 4/4 dragon in addition to its other types and gains menace.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // 2026-06-01 follow-up — Pattern D: Kheru Goldkeeper. "Put two +1/+1
  // counters and a flying counter on target creature" — no comma between
  // counters, just "and". The v0.30 multi-counter arm required ≥1 comma.
  it('matches Kheru Goldkeeper "+1/+1 counters and a flying counter"', () => {
    const kheru =
      'flying whenever one or more cards leave your graveyard during your turn, create a treasure token. renew — {2}{b}{g}{u}, exile this card from your graveyard: put two +1/+1 counters and a flying counter on target creature. activate only as a sorcery.';
    expect(rule.match!(kheru)).toBeTruthy();
  });

  // 2026-06-01 follow-up — sanity: the negative guards on the new "with X
  // counter" / "and a <kw> counter" arms must not leak onto unrelated
  // "with a creature in your graveyard" / "with a charge counter" frames.
  it('does NOT fire on bare "target creature with a flying counter" (cares clause, not a grant)', () => {
    expect(rule.match!('target creature with a flying counter on it')).toBe(false);
  });

  // v0.14.2 — keyword-counter broadening: "put a flying counter on it" grants
  // flying via the keyword-counter mechanism (Call a Surprise Witness).
  it('matches "put a flying counter on it" (keyword-counter form)', () => {
    expect(rule.match!('put a flying counter on it')).toBeTruthy();
  });

  it('matches "put a menace counter on target creature" (keyword-counter form)', () => {
    expect(rule.match!('put a menace counter on target creature')).toBeTruthy();
  });
});
