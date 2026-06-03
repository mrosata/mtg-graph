import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_artifacts';

describe('condition.cares_artifacts', () => {
  it.each([
    ['whenever you cast an artifact spell, draw a card'],
    ['whenever an artifact you control enters, scry 1'],
    ['for each artifact you control, this creature gets +1/+0'],
    ['artifacts you control have indestructible'],
    ['if you control three or more artifacts, draw a card'],
    ['noncreature artifacts you control have ward 1'],
    ['as long as you control two or more artifacts, this creature gets +2/+0'],
    ['whenever this creature attacks while you control two or more artifacts, it gets +2/+1'],
    // v0.12.9 — "if an artifact entered the battlefield under your control
    // this turn" gating (Akal Pakal, First Among Equals).
    ['at the beginning of each player\'s end step, if an artifact entered the battlefield under your control this turn, look at the top two cards of your library'],
    ['if an artifact entered the battlefield under your control this turn, draw a card'],
    // v0.14.1 — "as long as an artifact entered the battlefield ..." gating.
    // Shipwreck Sentry: defender unless an artifact ETB'd this turn.
    ['as long as an artifact entered the battlefield under your control this turn, this creature can attack as though it didn\'t have defender'],
    // v0.14.1 — "this <type> or another <type> entered the battlefield ..."
    // Craft-activation gate. Master's Manufactory.
    ['activate only if this artifact or another artifact entered the battlefield under your control this turn'],
    // v0.14.1 — disjunctive cost form. Sunshot Militia.
    ['tap two untapped artifacts and/or creatures you control: this creature deals 1 damage to each opponent'],
    // v0.14.1 — disjunctive dig/reveal filter. Staunch Crewmate.
    ['you may reveal an artifact or pirate card from among them and put it into your hand'],
    // v0.14.6 — artifact-death scaling (Anzrag's Rampage): X equals "the
    // number of artifacts that were put into graveyards from the battlefield
    // this turn". Artifact-aristocrats payoff.
    ['where x is the number of artifacts that were put into graveyards from the battlefield this turn'],
    ['the number of artifacts that died this turn'],
    // v0.14.7 — per-turn sacrifice gate (Furtive Courier, Detective's Satchel).
    // "as long as you've sacrificed an artifact this turn" / "activate only
    // if you've sacrificed an artifact this turn" — payoff that gates on the
    // controller having sacrificed an artifact during the current turn.
    ["this creature can't be blocked as long as you've sacrificed an artifact this turn"],
    ["activate only if you've sacrificed an artifact this turn"],
    ['if you have sacrificed an artifact this turn, draw a card'],
    // v0.14.12 — artifact-LtB observer trigger (Krenko, Baron of Tin Street).
    // The trigger itself observes artifacts leaving the battlefield — strong
    // artifacts-as-resource signal even though the controller doesn't act.
    ['whenever an artifact is put into a graveyard from the battlefield, you may pay {r}'],
    ['whenever an artifact dies, draw a card'],
    ['when an artifact you control leaves the battlefield, create a treasure token'],
    // v0.14.12 — aristocrats observer: "whenever you sacrifice an artifact"
    // (Magnetic Snuffler). Controller-side sacrifice observation.
    ['whenever you sacrifice an artifact, put a +1/+1 counter on this creature'],
    ['whenever you sacrifice one or more artifacts, draw a card'],
    // 2026-06-01 audit Group 21 — Demonic Junker: "Affinity for artifacts" is
    // a printed keyword that scales the cast cost by the number of artifacts
    // controlled. Reminder text is stripped, leaving the bare keyword.
    ['affinity for artifacts when this vehicle enters, for each player, destroy up to one target creature that player controls'],
    // v0.30 — Group 4 — cost-reducer (Voyager Quickwelder): "Artifact spells
    // you cast cost {1} less to cast" is an artifact-payoff frame.
    ['artifact spells you cast cost {1} less to cast.'],
    // v0.30 — Group 4 — mana-restriction (Guidelight Optimizer): "Spend this
    // mana only to cast an artifact spell" is an artifact-payoff frame.
    ['{t}: add {u}. spend this mana only to cast an artifact spell or activate an ability.'],
    // v0.32 — Group 7 — static-gate "as long as / while / if you control an
    // artifact" (Cloudsculpt Technician, Gravblade Heavy, Magitek Infantry).
    ['flying as long as you control an artifact, this creature gets +1/+0.'],
    ['as long as you control an artifact, this creature gets +1/+0 and has deathtouch.'],
    ['this creature gets +1/+0 as long as you control another artifact. {2}{w}: search your library for a card named __self__, put it onto the battlefield tapped, then shuffle.'],
    // v0.35.0 — Batch 4: Mouser Mark III. "Unless you control another artifact"
    // is the negation-polarity form of the same conditional gate. The
    // restriction still scales on whether you control an artifact.
    ["this creature can't attack unless you control another artifact."],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['destroy target artifact'],                  // removal, not cares
    ['create a treasure token'],                  // treasures are artifacts but this is an effect
    ['this creature is an artifact creature'],    // typeline-like
    ['return target artifact card from your graveyard to your hand'],
    ['draw a card'],
    // v0.14.12 guards — opponent-side / edict frames must NOT leak into the
    // controller-cares-artifacts axis. "an opponent sacrifices an artifact"
    // is an edict effect on the opponent, not the controller caring.
    ['target opponent sacrifices an artifact'],
    ['each opponent sacrifices an artifact'],
    // v0.14.12 guards — type-removal effects shouldn't match the LtB-observer
    // pattern. "destroy target artifact" is removal, not observation.
    ['destroy an artifact and a creature'],
    // v0.15 — single-target type filter "target artifact or <type> you control"
    // (Molten Duplication). The "target" qualifier identifies a removal/copy
    // target, not artifacts as a payoff resource.
    ["create a token that's a copy of target artifact or creature you control"],
    ['destroy target artifact or creature you control'],
    // v0.15 — exile-from-hand cost frame "an artifact or <type> card from your
    // hand" (Nexus of Becoming). The cost specifies a card type filter for
    // an exile-as-cost, not artifact count or artifact-as-resource scaling.
    ['you may exile an artifact or creature card from your hand'],
    ['discard an artifact or creature card from your hand'],
    // v0.15 — aura enchant filter "enchant artifact or <type> you control"
    // (Moonlit Meditation). Same structural FP as "target" — one-time type
    // filter at cast time, not artifact-payoff.
    ['enchant artifact or creature you control'],
    // v0.30 — Group 3 — selector frames. Earthrumbler ("an artifact or
    // creature card from your graveyard" as cost), Intimidation Tactics
    // ("you choose an artifact or creature card from it"), Waxen Shapethief
    // ("as a copy of an artifact or creature you control"). These are not
    // artifact-payoff resource frames; they're single-instance selectors.
    ['vigilance, trample exile an artifact or creature card from your graveyard: this vehicle becomes an artifact creature until end of turn. crew 3'],
    ['target opponent reveals their hand. you choose an artifact or creature card from it. exile that card. cycling {3}'],
    ['flash you may have this creature enter as a copy of an artifact or creature you control. cycling {2}'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
