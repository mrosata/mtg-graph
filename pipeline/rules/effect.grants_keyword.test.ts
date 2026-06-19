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
      // v0.35.0 — Batch 23: conditional anthem with `with <modifier>` clause.
      // Emil, Vastlands Roamer: "creatures you control with +1/+1 counters
      // on them have trample" — the `with` filler admits a short modifier
      // clause between the subject and the anthem verb.
      ['creatures you control with +1/+1 counters on them have trample.'],
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

  describe('grants_vigilance — "they (also) have <kw>" anaphoric frame (Radiant Destiny)', () => {
    // Radiant Destiny: "as long as you have the city's blessing, they also
    // have vigilance." The "they" subject is anaphoric — refers to the tribe
    // named earlier in the ability. Previously no frame matched this shape.
    it('matches "they also have vigilance" frame', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match("as long as you have the city's blessing, they also have vigilance.")).toBeTruthy();
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

    // v0.20 — 4-item list (Sword of Vengeance): "has first strike, vigilance,
    // trample, and haste". Frame (f)'s inner pre-item filler was bumped from
    // {0,1}? to {0,4}? so haste at position 4 still matches.
    it('grants_haste matches fourth item in has-list (Sword of Vengeance)', () => {
      const r = ruleFor('effect.grants_haste');
      expect(r.match('equipped creature has first strike, vigilance, trample, and haste')).toBeTruthy();
    });
    it('grants_trample matches third item in 4-item has-list', () => {
      const r = ruleFor('effect.grants_trample');
      expect(r.match('equipped creature has first strike, vigilance, trample, and haste')).toBeTruthy();
    });
    it('grants_vigilance matches second item in 4-item has-list', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match('equipped creature has first strike, vigilance, trample, and haste')).toBeTruthy();
    });
  });

  describe('grants_double_strike', () => {
    const r = ruleFor('effect.grants_double_strike');

    it.each([
      ['target creature gains double strike until end of turn'],
      ['equipped creature has double strike'],
      // Gallant Pie-Wielder — Celebration self-grant via "has"
      ['this creature has double strike as long as two or more nonland permanents entered the battlefield under your control this turn'],
      // v0.32 — Group 13 — Thrumming Hivepool: "slivers you control have
      // double strike and haste". Tribal anthem with kw on the LEFT side of
      // "have <kw> and <other-kw>". Existing Frame (f2) catches kw on the
      // RIGHT side; Frame (f3) added to catch the left side. The trailing
      // "have haste" already fires grants_haste via Frame (f2).
      ['affinity for slivers slivers you control have double strike and haste. at the beginning of your upkeep, create two 1/1 colorless sliver creature tokens.'],
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

    // 2026-06-01 audit batch — Qarsi Revenant: multi-counter clause "put a
    // flying counter, a deathtouch counter, and a lifelink counter on
    // target creature". Each grants_<kw> fires on its own keyword wherever
    // it sits in the list.
    const qarsi =
      'put a flying counter, a deathtouch counter, and a lifelink counter on target creature';

    it('grants_deathtouch matches Qarsi Revenant multi-counter clause (middle)', () => {
      expect(ruleFor('effect.grants_deathtouch').match(qarsi)).toBeTruthy();
    });

    it('grants_lifelink matches Qarsi Revenant multi-counter clause (last)', () => {
      expect(ruleFor('effect.grants_lifelink').match(qarsi)).toBeTruthy();
    });

    // 2026-06-01 follow-up — Pattern D under-shipment: "+1/+1 counter and a
    // <kw> counter" — bare "and" conjunction, no comma between counters.
    // The v0.30 multi-counter regex required ≥1 comma; this catches the
    // 2-item "+1/+1 and a <kw>" frame used by the BLB/DSK Renew family.
    //
    // Driving cards:
    //   - Champion of Dusan: "put a +1/+1 counter and a trample counter"
    //   - Sagu Pummeler:     "put two +1/+1 counters and a reach counter"
    it('grants_trample matches Champion of Dusan "+1/+1 counter and a trample counter"', () => {
      const champion =
        'renew — {1}{g}, exile this card from your graveyard: put a +1/+1 counter and a trample counter on target creature. activate only as a sorcery.';
      expect(ruleFor('effect.grants_trample').match(champion)).toBeTruthy();
    });

    it('grants_reach matches Sagu Pummeler "two +1/+1 counters and a reach counter"', () => {
      const sagu =
        'renew — {4}{g}, exile this card from your graveyard: put two +1/+1 counters and a reach counter on target creature. activate only as a sorcery.';
      expect(ruleFor('effect.grants_reach').match(sagu)).toBeTruthy();
    });

    // 2026-06-01 follow-up — Pattern D: "with a <kw> counter ... on it"
    // frame for reanimation/return-with effects.
    //
    // Driving card:
    //   - Perennation: "return target permanent card from your graveyard to
    //     the battlefield with a hexproof counter and an indestructible
    //     counter on it"
    //
    // The "with X counter" arm is anchored on a preceding battlefield-
    // entering verb (enters | returns) within ~120 chars to keep it from
    // leaking onto unrelated "with ... counter" clauses (e.g. "deal damage
    // equal to the number of cards in your hand with a charge counter").
    const perennation =
      'return target permanent card from your graveyard to the battlefield with a hexproof counter and an indestructible counter on it.';

    it('grants_hexproof matches Perennation "return ... with a hexproof counter on it"', () => {
      expect(ruleFor('effect.grants_hexproof').match(perennation)).toBeTruthy();
    });

    it('grants_indestructible matches Perennation "return ... with an indestructible counter on it"', () => {
      expect(ruleFor('effect.grants_indestructible').match(perennation)).toBeTruthy();
    });

    // Negative — "with" arm must not fire when no enters/returns verb
    // anchors the clause. These are unrelated "with"-clauses that happen to
    // contain a kw-named counter word.
    it('grants_hexproof does NOT fire on bare "with a hexproof counter" without enter/return verb', () => {
      const r = ruleFor('effect.grants_hexproof');
      // Cards that already have hexproof counters but don't grant them.
      expect(r.match('target creature with a hexproof counter on it')).toBe(false);
      expect(r.match('whenever a creature with a hexproof counter dies, draw a card.')).toBe(false);
    });
  });

  // ── 2026-06-01 follow-up — Sarkhan, Dragon Ascendant self-conditional ───
  // Sarkhan's text: "Until end of turn, __self__ becomes a Dragon in
  // addition to its other types and gains flying." This is a self-
  // conditional evasion grant (companion tag: effect.gains_keyword_self_conditional).
  // Per the v0.21 policy memo, stripping ability-word self-conditional
  // self-becomes-X-and-gains-evasion clauses from grants_evasion is safe.
  // The non-evasion grants_<kw> family is unaffected because evasion-only
  // keywords (flying/menace/intimidate) hit the strip; non-evasion
  // keywords are not part of the becomes-and-gains-evasion frame.
  //
  // Sanity: non-evasion grantable keywords (trample/lifelink/etc.) on a
  // genuine become-with frame still fire. This regression guards that
  // path.
  describe('grants_<kw> — Sarkhan becomes-X-and-gains-flying does not over-narrow non-evasion (v0.31)', () => {
    // Sanity: still fires on the genuine "becomes a [type] with [...], <kw>" frame.
    it('grants_trample still fires on "becomes a beast with ..., trample"', () => {
      const r = ruleFor('effect.grants_trample');
      expect(r.match('this creature is a beast with base power and toughness 4/4, trample')).toBeTruthy();
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
  // it has flying and vigilance" — flying is evasion (stripped, fires on
  // gains_keyword_self_conditional); vigilance is non-evasion grantable so
  // v0.21.0 the clause is PRESERVED and grants_vigilance fires.
  describe('self-anaphoric "it has <kw>" — evasion strip only (v0.21)', () => {
    const wardenTxt = 'as long as this creature has three or more counters on it, it has flying and vigilance.';

    it('grants_vigilance FIRES on Warden (vigilance is non-evasion grantable)', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match(wardenTxt)).toBeTruthy();
    });
  });

  // ── v0.14.14 → v0.21.0 — gate-first self-conditional, EXPLICIT self subj ─
  // Living Conundrum / Pompous Gadabout: "(as long as|while|if|during) X,
  // this creature has Y." — gate clause comes FIRST, post-comma subject is
  // an explicit "this creature" / "__self__" (not anaphoric "it").
  // v0.21.0 — strip is evasion-only; non-evasion grantable keywords in the
  // clause (vigilance, hexproof, etc.) are preserved and fire grants_<kw>.
  describe('gate-first self-conditional — evasion-only strip (v0.21)', () => {
    const livingConundrumTxt =
      'as long as there are no cards in your library, this creature has base power and toughness 10/10 and has flying and vigilance.';
    const pompousGadaboutTxt = 'during your turn, this creature has hexproof.';

    it('grants_vigilance FIRES on Living Conundrum (non-evasion preserved)', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(r.match(livingConundrumTxt)).toBeTruthy();
    });

    it('grants_hexproof FIRES on Pompous Gadabout (non-evasion preserved)', () => {
      const r = ruleFor('effect.grants_hexproof');
      expect(r.match(pompousGadaboutTxt)).toBeTruthy();
    });

    // Sanity — subject-first self-conditional ("this creature has X as long
    // as Y") IS still a grants_<kw> match (Grand Ball Guest, Gallant
    // Pie-Wielder). Subject-first never strips.
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

  // ── v0.14.26 → v0.21.0 — triggered self-buff: evasion-only strip ─────────
  // Rot Farm Mortipede: "Whenever one or more creature cards leave your
  // graveyard, this creature gets +1/+0 and gains menace and lifelink until
  // end of turn." The verb after the self subject is "gets" (not "has"), and
  // the gate is a `whenever` trigger (not the `as long as|while|if|during`
  // family the v0.14.14 strip handled).
  //
  // v0.21.0 design change: the strip ONLY fires when the self-conditional
  // clause is purely evasion (flying/menace/intimidate) — those keywords have
  // a dedicated `effect.gains_keyword_self_conditional` axis. Non-evasion
  // grantable keywords (haste/trample/lifelink/deathtouch/first strike/
  // double strike/vigilance/hexproof/indestructible/reach/prowess) have NO
  // self-conditional companion tag, so they MUST still fire grants_<kw> here.
  describe('triggered self-buff — evasion-only strip (v0.21)', () => {
    const rotFarmTxt =
      'whenever one or more creature cards leave your graveyard, this creature gets +1/+0 and gains menace and lifelink until end of turn.';

    // v0.21.0 — lifelink is non-evasion grantable; the strip preserves the
    // clause so grants_lifelink fires.
    it('grants_lifelink FIRES on Rot Farm Mortipede (non-evasion preserved)', () => {
      const r = ruleFor('effect.grants_lifelink');
      expect(r.match(rotFarmTxt)).toBeTruthy();
    });

    // Single-fire "when" gate with anaphoric "it" subject. v0.21.0 — trample
    // is non-evasion grantable; clause preserved, grants_trample fires.
    it('grants_trample FIRES on "when this creature attacks, it gets +1/+1 and gains trample"', () => {
      const r = ruleFor('effect.grants_trample');
      expect(r.match('when this creature attacks, it gets +1/+1 and gains trample until end of turn.')).toBeTruthy();
    });

    // v0.21.0 — Fear of the Dark regression: "it gains menace and deathtouch"
    // grants deathtouch (non-evasion).
    it('grants_deathtouch FIRES on Fear of the Dark', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(
        r.match(
          'whenever this creature attacks, if defending player controls no glimmer creatures, it gains menace and deathtouch until end of turn.',
        ),
      ).toBeTruthy();
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

  // FIX 17 (BR-12) — Crystal Barricade: "you have hexproof". Player-target
  // hexproof grant. Restricted to slug === 'hexproof' (most keywords like
  // haste / deathtouch / etc. don't grant to players).
  describe('grants_hexproof player-target "you have hexproof" (BR-12)', () => {
    it('grants_hexproof matches "you have hexproof"', () => {
      const r = ruleFor('effect.grants_hexproof');
      expect(
        r.match('defender\nyou have hexproof.\nprevent all noncombat damage that would be dealt to other creatures you control.'),
      ).toBeTruthy();
    });

    it('grants_deathtouch does NOT broadcast the player-target frame', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match('you have deathtouch.')).toBe(false);
    });
  });

  // FIX 14 (BR-9) — compound static frames on tribal anthems.
  // Crossway Troublemakers: "attacking vampires you control have deathtouch
  // and lifelink" — the tribal subject has a state adjective ("attacking")
  // before the tribe noun. Death Baron: "skeletons you control and other
  // zombies you control get +1/+1 and have deathtouch" — anthem grant
  // expressed as "get +N/+N and have <kw>".
  describe('compound static frame and "get +N/+N and have <kw>" anthem (BR-9)', () => {
    it('grants_deathtouch matches "attacking vampires you control have deathtouch and lifelink"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(r.match('attacking vampires you control have deathtouch and lifelink.')).toBeTruthy();
    });

    it('grants_deathtouch matches "skeletons you control and other zombies you control get +1/+1 and have deathtouch"', () => {
      const r = ruleFor('effect.grants_deathtouch');
      expect(
        r.match('skeletons you control and other zombies you control get +1/+1 and have deathtouch.'),
      ).toBeTruthy();
    });
  });

  // v0.30 — Group 11a: Aura conjunction "Enchanted permanent gets +N/+N and
  // has <kw>" (Lightwheel Enhancements, Silken Strength). The existing
  // get-anthem frame uses bare "get" (plural creatures); the Aura form uses
  // "gets" (singular enchanted permanent). Verb slot widened to `gets?`.
  describe('grants_<kw> — Aura "enchanted permanent gets +N/+N and has <kw>" (v0.30 Group 11a)', () => {
    it('grants_vigilance matches "enchanted permanent gets +1/+1 and has vigilance" (Lightwheel)', () => {
      const r = ruleFor('effect.grants_vigilance');
      expect(
        r.match('enchant creature or vehicle start your engines! enchanted permanent gets +1/+1 and has vigilance. max speed — you may cast this card from your graveyard.'),
      ).toBeTruthy();
    });

    it('grants_reach matches "enchanted permanent gets +1/+2 and has reach" (Silken Strength)', () => {
      const r = ruleFor('effect.grants_reach');
      expect(
        r.match('flash enchant creature or vehicle when this aura enters, untap enchanted permanent. enchanted permanent gets +1/+2 and has reach.'),
      ).toBeTruthy();
    });

    it('grants_haste matches singular "enchanted creature gets +1/+0 and has haste"', () => {
      const r = ruleFor('effect.grants_haste');
      expect(r.match('enchanted creature gets +1/+0 and has haste')).toBeTruthy();
    });
  });

  // v0.30 — Group 11b: anthem-by-type — "Vehicles you control have haste"
  // (Fearless Swashbuckler), "Mounts and vehicles you control have haste"
  // (Kolodin). The tribal anthem frame must reach these — Fearless has the
  // text right after the printed-keyword line (no punctuation separator),
  // and Kolodin uses a compound subject "Mounts and vehicles".
  describe('grants_haste — anthem-by-type (v0.30 Group 11b)', () => {
    const r = ruleFor('effect.grants_haste');

    it('matches "vehicles you control have haste" after a bare printed keyword (Fearless Swashbuckler)', () => {
      expect(r.match('haste vehicles you control have haste. whenever you attack, if a pirate and a vehicle attacked this combat, draw three cards, then discard two cards.')).toBeTruthy();
    });

    it('matches "mounts and vehicles you control have haste" (Kolodin)', () => {
      expect(r.match('mounts and vehicles you control have haste. whenever a mount you control enters, it becomes saddled until end of turn.')).toBeTruthy();
    });
  });
});
