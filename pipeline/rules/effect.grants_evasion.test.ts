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
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
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
