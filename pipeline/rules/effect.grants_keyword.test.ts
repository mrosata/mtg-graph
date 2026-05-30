import { describe, it, expect } from 'vitest';
import { rules, tagDefs } from './effect.grants_keyword';

function ruleFor(id: string) {
  const r = rules.find((r) => r.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return r;
}

describe('effect.grants_keyword parametric', () => {
  it('exports one rule + tagDef per grantable keyword', () => {
    expect(rules.length).toBe(11);
    expect(tagDefs.length).toBe(11);
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('effect.grants_haste')).toBe(true);
    expect(ids.has('effect.grants_trample')).toBe(true);
    expect(ids.has('effect.grants_first_strike')).toBe(true);
    expect(ids.has('effect.grants_double_strike')).toBe(true);
  });

  it('all tagDefs are effect-axis', () => {
    for (const def of tagDefs) {
      expect(def.axis).toBe('effect');
    }
  });

  describe('grants_haste', () => {
    const r = ruleFor('effect.grants_haste');

    it.each([
      // Temporary grant — Become Brutes
      ['one or two target creatures each gain haste until end of turn'],
      // Anthem — "creatures you control have haste"
      ['creatures you control have haste'],
      // Aura grant — "Enchanted creature has haste"
      ['enchanted creature has haste'],
      // Equipment grant
      ['equipped creature has haste'],
      // Other-creatures anthem
      ['other creatures you control have haste'],
    ])('matches: %s', (text) => {
      expect(r.match(text)).toBeTruthy();
    });

    it.each([
      // Bare "haste" alone is intrinsic (effect.has_haste, not grants_haste)
      ['haste'],
      ['flying, haste'],
      // Trigger / condition — different axes
      ['whenever you cast a haste creature'],
      ['draw a card'],
    ])('does not match: %s', (text) => {
      expect(r.match(text)).toBe(false);
    });
  });

  describe('grants_trample', () => {
    const r = ruleFor('effect.grants_trample');

    it.each([
      // Charging Hooligan — conditional self-grant via "gains"
      ['if a rat is attacking, this creature gains trample until end of turn'],
      ['target creature gains trample until end of turn'],
      ['other creatures you control have trample'],
      ['enchanted creature gets +1/+1 and has trample'],
      // Grand Ball Guest — Celebration conditional self-grant via "has"
      ['this creature gets +1/+1 and has trample as long as two or more nonland permanents entered the battlefield under your control this turn'],
      // Bare __SELF__ conditional grant
      ['__self__ has trample as long as you control three or more lands'],
      // Regression (Syr Ginger): comma-list grant — KW is the LEADING item.
      ['__self__ has trample, hexproof, and haste as long as an opponent controls a planeswalker'],
      // v0.14.4 — 2-item choice variant ("your choice of trample or vigilance").
      ['target creature gains your choice of trample or vigilance until end of turn'],
    ])('matches: %s', (text) => {
      expect(r.match(text)).toBeTruthy();
    });

    it.each([
      // Intrinsic-only
      ['trample'],
      ['flying, trample'],
      ['draw a card'],
    ])('does not match: %s', (text) => {
      expect(r.match(text)).toBe(false);
    });
  });

  describe('grants_vigilance — token-creation frame', () => {
    // Regression (Virtue of Loyalty // Ardenvale Fealty): keyword baked into
    // the created token — "create a 2/2 white Knight creature token with
    // vigilance" should fire grants_vigilance.
    it('matches "create a … creature token with <kw>"', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match('create a 2/2 white knight creature token with vigilance')).toBeTruthy();
    });

    it('does NOT match plain "create a token" without a kw clause', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match('create a 1/1 white soldier creature token')).toBe(false);
    });

    // Regression (The Apprentice's Folly, v0.12.9): keyword baked into a
    // copy-token's "is a Reflection ..., and has haste" clause. The token-
    // creation frame must accept "create a token that's a copy of it ...
    // and has <kw>" (the "and has <kw>" continuation instead of "with <kw>").
    it('matches "create a token that\'s a copy ... and has <kw>"', () => {
      const r = ruleFor('effect.grants_haste');
      expect(r.match(
        "create a token that's a copy of it, except it isn't legendary, is a reflection in addition to its other types, and has haste",
      )).toBeTruthy();
    });
  });

  describe('grants_hexproof — 2-item "X and Y" (no comma)', () => {
    // Regression (Water Wings): "gains flying and hexproof" — two-item list
    // joined by bare "and". Frame (f) requires comma between items.
    it('grants_hexproof matches "gains flying and hexproof"', () => {
      const r = ruleFor('effect.grants_hexproof');
      expect(r.match('target creature you control gains flying and hexproof until end of turn')).toBeTruthy();
    });
  });

  describe('grants_hexproof and grants_haste — comma-list continuation', () => {
    // Regression (Syr Ginger): "__self__ has trample, hexproof, and haste"
    // — only the leading keyword (trample) fires via Frame (d) which requires
    // "has KW" adjacency. The 2nd and 3rd items in the list also need to fire.
    it('grants_hexproof matches second item in has-list', () => {
      const r = ruleFor('effect.grants_hexproof');
      expect(r.match('__self__ has trample, hexproof, and haste as long as an opponent controls a planeswalker')).toBeTruthy();
    });

    it('grants_haste matches third (and-prefixed) item in has-list', () => {
      const r = ruleFor('effect.grants_haste');
      expect(r.match('__self__ has trample, hexproof, and haste as long as an opponent controls a planeswalker')).toBeTruthy();
    });

    // Sanity: bare "flying, trample" (no has-verb) is still not a grant.
    it('grants_trample does NOT fire on bare keyword list without has-verb', () => {
      const r = ruleFor('effect.grants_trample');
      expect(r.match('flying, trample')).toBe(false);
    });
  });

  describe('grants_double_strike', () => {
    const r = ruleFor('effect.grants_double_strike');

    it.each([
      ['target creature gains double strike until end of turn'],
      ['equipped creature has double strike'],
      // Gallant Pie-Wielder — Celebration self-grant via "has"
      ['this creature has double strike as long as two or more nonland permanents entered the battlefield under your control this turn'],
    ])('matches: %s', (text) => {
      expect(r.match(text)).toBeTruthy();
    });

    it.each([
      ['double strike'], // intrinsic
      ['first strike'], // different keyword
      ['draw a card'],
    ])('does not match: %s', (text) => {
      expect(r.match(text)).toBe(false);
    });
  });

  describe('grants via type-transformation ("is a X with…")', () => {
    // Goddric pattern: "is a Dragon with base power and toughness 4/4, flying"
    // Should match grants_<flying-like-keyword>. We use grants_trample since
    // flying isn't a grantable keyword in this rule family (grants_evasion
    // handles flying/menace/intimidate via a separate rule).
    it('matches "is a [type] with…, trample" frame', () => {
      const r = ruleFor('effect.grants_trample');
      expect(r.match('this creature is a beast with base power and toughness 4/4, trample, and "{r}: this creature gets +1/+0 until end of turn"')).toBeTruthy();
    });

    it('matches "becomes a [type] with…lifelink" frame', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(r.match('until end of turn, this creature becomes a 4/4 angel with flying and lifelink')).toBeTruthy();
    });
  });

  describe('grants_lifelink — spell-grants frame', () => {
    // Regression (Heartflame Duelist): "Instant and sorcery spells you control
    // have lifelink" — the lifelink applies to noncreature spells, not to a
    // creature. The grant frames historically scoped to "creature(s)"; this
    // adds a separate spell-scoped frame.
    const r = ruleFor('effect.grants_lifelink');

    it.each([
      ['instant and sorcery spells you control have lifelink'],
      ['spells you control have lifelink'],
      ['instant spells you control have lifelink'],
      ['sorcery spells you control gain lifelink'],
    ])('matches: %s', (text) => {
      expect(r.match(text)).toBeTruthy();
    });
  });

  describe('grants_first_strike — multi-word spelling', () => {
    const r = ruleFor('effect.grants_first_strike');

    it.each([
      ['target creature gains first strike until end of turn'],
      ['equipped creature has first strike'],
      ['creatures you control have first strike'],
    ])('matches: %s', (text) => {
      expect(r.match(text)).toBeTruthy();
    });

    it.each([
      ['first strike'], // intrinsic
      ['double strike'], // intrinsic, not a grant
    ])('does not match: %s', (text) => {
      expect(r.match(text)).toBe(false);
    });

    // Double strike is a superset of first strike — granting double strike also
    // grants first strike by game rules. Mirror the has_first_strike broadening.
    it('matches "gains double strike" and sets metadata.doubleStrike', () => {
      const result = r.match('target creature gains double strike until end of turn');
      expect(result).toBeTruthy();
      expect(result).toMatchObject({ metadata: { doubleStrike: true } });
    });

    it('matches "have double strike" anthem and sets metadata.doubleStrike', () => {
      const result = r.match('creatures you control have double strike');
      expect(result).toBeTruthy();
      expect(result).toMatchObject({ metadata: { doubleStrike: true } });
    });

    // Regression: Case of the Shattered Pact — "gains flying, double strike, and vigilance"
    it('matches comma-list grant containing double strike (Case of the Shattered Pact)', () => {
      const result = r.match(
        'at the beginning of combat on your turn, target creature you control gains flying, double strike, and vigilance until end of turn.',
      );
      expect(result).toBeTruthy();
      expect(result).toMatchObject({ metadata: { doubleStrike: true } });
    });
  });

  // v0.14.1 — tribal anthem subject (Palani's Hatcher) and singular "with
  // <kw>" inside transformation clause (Tendril of the Mycotyrant).
  describe('grants_haste — tribal anthem and singular with-clause', () => {
    const r = ruleFor('effect.grants_haste');

    it.each([
      // Palani's Hatcher: tribal anthem ("Other Dinosaurs you control have haste").
      ['other dinosaurs you control have haste'],
      ['pirates you control have haste'],
      // Tendril of the Mycotyrant: singular "becomes a [...] creature with haste".
      ['it becomes a 0/0 fungus creature with haste. it\'s still a land.'],
      ['target creature becomes a 4/4 dragon with haste'],
    ])('matches: %s', (text) => {
      expect(r.match(text)).toBeTruthy();
    });
  });

  // v0.14.4 — multi-keyword choice grants ("gains your choice of X, Y, or Z").
  // Ezrim, Agency Chief fires ALL three of vigilance/lifelink/hexproof. Each
  // parametric rule must match its own kw wherever it sits in the choice list.
  describe('multi-keyword choice grant — "gains your choice of <kw>, <kw>, or <kw>"', () => {
    // Ezrim Agency Chief — kw is LAST item.
    it('grants_hexproof matches "your choice of vigilance, lifelink, or hexproof"', () => {
      const r = ruleFor('effect.grants_hexproof');
      expect(
        r.match('__self__ gains your choice of vigilance, lifelink, or hexproof until end of turn'),
      ).toBeTruthy();
    });

    // Ezrim — kw is MIDDLE item.
    it('grants_lifelink matches "your choice of vigilance, lifelink, or hexproof"', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(
        r.match('__self__ gains your choice of vigilance, lifelink, or hexproof until end of turn'),
      ).toBeTruthy();
    });

    // Ezrim — kw is FIRST item.
    it('grants_vigilance matches "your choice of vigilance, lifelink, or hexproof"', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(
        r.match('__self__ gains your choice of vigilance, lifelink, or hexproof until end of turn'),
      ).toBeTruthy();
    });

    // 4-item choice variant — kw mid-list.
    it('grants_vigilance matches 4-item choice list', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(
        r.match('__self__ gains your choice of haste, trample, vigilance, or lifelink until end of turn'),
      ).toBeTruthy();
    });
  });

  // ── Keyword-counter broadening (Issue 1) ─────────────────────────────────
  // Cards like "Call a Surprise Witness" put a flying counter on a creature,
  // granting the keyword via the keyword-counter mechanism.
  describe('keyword-counter form — "put a <kw> counter on"', () => {
    it('grants_deathtouch matches "put a deathtouch counter on it"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match('put a deathtouch counter on it')).toBeTruthy();
    });

    it('grants_double_strike matches "put a double strike counter on it"', () => {
      const r = ruleFor('effect.grants_double_strike');
      expect(r.match('put a double strike counter on it')).toBeTruthy();
    });

    it('grants_first_strike matches "put a double strike counter on it" (superset)', () => {
      const result = ruleFor('effect.grants_first_strike').match('put a double strike counter on it');
      expect(result).toBeTruthy();
      expect(result).toMatchObject({ metadata: { doubleStrike: true } });
    });
  });

  // ── Self-animation narrowing (Issue 2) ────────────────────────────────────
  // "This case is a 4/4 Gorgon creature with deathtouch and lifelink" is a
  // Case/saga that transforms itself — NOT granting keywords to other creatures.
  describe('self-animation frame must NOT fire grants_<kw>', () => {
    // Case of the Gorgon's Kiss (normalized excerpt)
    const caseTxt =
      'solved — this case is a 4/4 gorgon creature with deathtouch and lifelink in addition to its other types.';

    it('grants_deathtouch does NOT fire on "this case is a 4/4 … with deathtouch"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match(caseTxt)).toBe(false);
    });

    it('grants_lifelink does NOT fire on "this case is a 4/4 … with … lifelink"', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(r.match(caseTxt)).toBe(false);
    });

    // Ensure we haven't over-narrowed: these real grants must still fire.
    it('grants_deathtouch still matches "target creature gains deathtouch"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match('target creature gains deathtouch until end of turn')).toBeTruthy();
    });

    it('grants_lifelink still matches "creatures you control have lifelink"', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(r.match('creatures you control have lifelink')).toBeTruthy();
    });
  });

  // ── Self-anaphoric "it has <kw>" narrowing ───────────────────────────────
  // Regression (Warden of the Inner Sky): "as long as this creature has [cond],
  // it has flying and vigilance" — the "it" antecedent is "this creature" and
  // the grant belongs to gains_keyword_self_conditional, not grants_<kw>.
  describe('self-anaphoric "it has <kw>" in gating clause must NOT fire grants_<kw>', () => {
    const wardenTxt = 'as long as this creature has three or more counters on it, it has flying and vigilance.';

    it('grants_vigilance does NOT fire on Warden self-conditional', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match(wardenTxt)).toBe(false);
    });
  });

  // ── v0.14.14 — gate-first self-conditional with EXPLICIT self subject ────
  // Living Conundrum / Pompous Gadabout: "(as long as|while|if|during) X,
  // this creature has Y." — gate clause comes FIRST, post-comma subject is
  // an explicit "this creature" / "__self__" (not anaphoric "it"). Same
  // axis as the Warden anaphoric case — belongs to
  // gains_keyword_self_conditional, not grants_<kw>.
  describe('gate-first self-conditional with explicit subject must NOT fire grants_<kw>', () => {
    const livingConundrumTxt =
      'as long as there are no cards in your library, this creature has base power and toughness 10/10 and has flying and vigilance.';
    const pompousGadaboutTxt = 'during your turn, this creature has hexproof.';

    it('grants_vigilance does NOT fire on Living Conundrum', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match(livingConundrumTxt)).toBe(false);
    });

    it('grants_hexproof does NOT fire on Pompous Gadabout ("during your turn" gate)', () => {
      const r = ruleFor('effect.grants_hexproof');
      expect(r.match(pompousGadaboutTxt)).toBe(false);
    });

    // Sanity — subject-first self-conditional ("this creature has X as long
    // as Y") IS still a grants_<kw> match (Grand Ball Guest, Gallant
    // Pie-Wielder). Gate-first only is the new exclusion.
    it('grants_trample STILL fires on Grand Ball Guest (subject-first)', () => {
      const r = ruleFor('effect.grants_trample');
      const grandBallTxt =
        'celebration — this creature gets +1/+1 and has trample as long as two or more nonland permanents entered the battlefield under your control this turn.';
      expect(r.match(grandBallTxt)).toBeTruthy();
    });
  });

  // ── "That spell gains <kw>" exclusion ────────────────────────────────────
  // Regression (Judith, Carnage Connoisseur): "That spell gains deathtouch and
  // lifelink." The subject is a spell, not a creature — the tagDef explicitly
  // scopes to creature grants. Spell-grants are a rare adjacent axis.
  describe('"(that|the|this) spell gains <kw>" must NOT fire grants_<kw>', () => {
    const judithTxt = 'whenever you cast an instant or sorcery spell, choose one — • that spell gains deathtouch and lifelink. • create a 2/2 red imp creature token.';

    it('grants_deathtouch does NOT fire on "that spell gains deathtouch"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match(judithTxt)).toBe(false);
    });

    it('grants_lifelink does NOT fire on "that spell gains lifelink"', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(r.match(judithTxt)).toBe(false);
    });

    // Sanity — direct frame must still fire when subject isn't a spell.
    it('grants_deathtouch still fires on "target creature gains deathtouch"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match('target creature gains deathtouch until end of turn')).toBeTruthy();
    });
  });

  // ── v0.14.26 — triggered self-buff exclusion ─────────────────────────────
  // Rot Farm Mortipede: "Whenever one or more creature cards leave your
  // graveyard, this creature gets +1/+0 and gains menace and lifelink until
  // end of turn." The verb after the self subject is "gets" (not "has"), and
  // the gate is a `whenever` trigger (not the `as long as|while|if|during`
  // family the v0.14.14 strip handled). Extend the strip to cover these
  // shapes; the trailing "gains lifelink" must NOT fire grants_lifelink.
  describe('triggered self-buff must NOT fire grants_<kw>', () => {
    const rotFarmTxt =
      'whenever one or more creature cards leave your graveyard, this creature gets +1/+0 and gains menace and lifelink until end of turn.';

    it('grants_lifelink does NOT fire on Rot Farm Mortipede', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(r.match(rotFarmTxt)).toBe(false);
    });

    // Single-fire "when" gate with anaphoric "it" subject.
    it('grants_trample does NOT fire on "when this creature attacks, it gets +1/+1 and gains trample"', () => {
      const r = ruleFor('effect.grants_trample');
      expect(r.match('when this creature attacks, it gets +1/+1 and gains trample until end of turn.')).toBe(false);
    });

    // Sanity — real triggered ANTHEM must still fire (different subject:
    // "creatures you control" / "other creatures", not self).
    it('grants_haste STILL fires on triggered anthem', () => {
      const r = ruleFor('effect.grants_haste');
      expect(r.match('whenever you cast a spell, creatures you control gain haste until end of turn.')).toBeTruthy();
    });

    // Sanity — mixed self+anthem in one trigger MUST still fire on the
    // anthem half. The safety lookahead in the new strip arm prevents the
    // strip from spanning past "other creatures" / "creatures you control".
    it('grants_trample STILL fires on mixed self+anthem trigger', () => {
      const r = ruleFor('effect.grants_trample');
      expect(
        r.match(
          'whenever this creature attacks, it gets +1/+1 and other creatures you control gain trample until end of turn.',
        ),
      ).toBeTruthy();
    });
  });
});
