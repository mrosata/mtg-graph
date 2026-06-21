import { describe, it, expect } from 'vitest';
import { rules, tagDefs } from './condition.cares_tribe';

describe('condition.cares_tribe parametric', () => {
  it('exports a rule per tribe', () => {
    // 2026-06-01 audit Group 10 — added `insect` tribe (Aatchik, Emerald Radian).
    // v0.32 — Group 12 — added `sliver` tribe (Thrumming Hivepool).
    // v0.39.0 — 200-card audit Ship 1 — added `turtle` tribe.
    // v0.50.0 — added `hero` and `villain` tribes (MSH tribal payoffs).
    expect(rules.length).toBe(42);
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('condition.cares_tribe.human')).toBe(true);
    expect(ids.has('condition.cares_tribe.merfolk')).toBe(true);
    expect(ids.has('condition.cares_tribe.elemental')).toBe(true);
    expect(ids.has('condition.cares_tribe.rat')).toBe(true);
    expect(ids.has('condition.cares_tribe.pirate')).toBe(true);
    expect(ids.has('condition.cares_tribe.skeleton')).toBe(true);
    expect(ids.has('condition.cares_tribe.detective')).toBe(true);
    // v0.16 — BLB animal tribes.
    expect(ids.has('condition.cares_tribe.rabbit')).toBe(true);
    expect(ids.has('condition.cares_tribe.raccoon')).toBe(true);
    expect(ids.has('condition.cares_tribe.mouse')).toBe(true);
    expect(ids.has('condition.cares_tribe.bat')).toBe(true);
    // v0.17 — backlog tribes (spirit / demon / angel / cat / dog / wolf).
    expect(ids.has('condition.cares_tribe.spirit')).toBe(true);
    expect(ids.has('condition.cares_tribe.wolf')).toBe(true);
    // v0.32 — Group 12 — sliver tribe (Thrumming Hivepool: "slivers you
    // control have double strike and haste").
    expect(ids.has('condition.cares_tribe.sliver')).toBe(true);
    // v0.39.0 — turtle tribe.
    expect(ids.has('condition.cares_tribe.turtle')).toBe(true);
    // v0.50.0 — hero and villain tribes (MSH tribal payoffs).
    expect(ids.has('condition.cares_tribe.hero')).toBe(true);
    expect(ids.has('condition.cares_tribe.villain')).toBe(true);
  });

  it('exports a tagDef per tribe with theme category', () => {
    expect(tagDefs.length).toBe(42);
    for (const def of tagDefs) {
      expect(def.axis).toBe('condition');
      expect(def.category).toBe('theme');
      expect(def.pairsWith).toEqual(['effect.create_creature_token']);
    }
  });

  it('matches plural and singular forms', () => {
    const humanRule = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(humanRule.match('humans you control gain lifelink')).toBeTruthy();
    expect(humanRule.match('this human gains +1/+1')).toBeTruthy();
    expect(humanRule.match('whenever an elf enters')).toBe(false);
  });

  it('matches on the tribe word with word boundaries', () => {
    const elfRule = rules.find((r) => r.id === 'condition.cares_tribe.elf')!;
    expect(elfRule.match('elf creatures you control')).toBeTruthy();
    expect(elfRule.match('elves you control')).toBeTruthy();
    expect(elfRule.match('elfin gnome enters')).toBe(false); // word boundary
  });

  it('elemental tribe matches Sunderflock-style payoffs', () => {
    const ele = rules.find((r) => r.id === 'condition.cares_tribe.elemental')!;
    expect(ele.match('this spell costs {x} less to cast, where x is the greatest mana value among elementals you control')).toBeTruthy();
    expect(ele.match('if a triggered ability of another elemental you control triggers')).toBeTruthy();
    expect(ele.match('spend this mana only to cast elemental spells')).toBeTruthy();
    // word boundary — "elementally" or "complemental" would be false positives
    expect(ele.match('this creature gains menace')).toBe(false);
  });

  // Regression: Brave the Wilds — "target land becomes a 3/3 Elemental creature with haste"
  // is token/animate framing, not an Elemental-tribal payoff. Same for Devouring Sugarmaw
  // "Create a 1/1 white Human creature token". The rule should not fire on these alone.
  it('elemental does NOT match "becomes a [...] elemental creature" framing alone', () => {
    const ele = rules.find((r) => r.id === 'condition.cares_tribe.elemental')!;
    expect(ele.match('target land becomes a 3/3 elemental creature with haste')).toBe(false);
  });

  it('human does NOT match "create a [N/N] [color] human creature token" framing alone', () => {
    const h = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(h.match('create a 1/1 white human creature token and a food token')).toBe(false);
    expect(h.match('create three 1/1 white human creature tokens')).toBe(false);
  });

  it('zombie does NOT match "create a [N/N] zombie creature token" framing alone', () => {
    const z = rules.find((r) => r.id === 'condition.cares_tribe.zombie')!;
    expect(z.match('create a 2/2 black zombie creature token')).toBe(false);
  });

  // Regression (Canonized in Blood): long multi-color, multi-type token
  // template — "create a 4/3 white and black vampire demon creature token
  // with flying" has 9 words between "create" and "token", exceeding the
  // old {1,7} window. The bump to {1,12} strips the framing so the rule
  // doesn't FP on the token type word.
  it('vampire does NOT match long multi-color multi-type token template alone', () => {
    const v = rules.find((r) => r.id === 'condition.cares_tribe.vampire')!;
    expect(v.match('create a 4/3 white and black vampire demon creature token with flying')).toBe(false);
  });

  // But genuine tribal references in the same card should still match after the strip.
  it('human still matches payoff references after token-strip', () => {
    const h = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(h.match('if you control four or more humans, this creature gets +1/+1. create a 1/1 white human creature token.')).toBeTruthy();
    expect(h.match('humans you control gain lifelink')).toBeTruthy();
  });

  // Regression (Burden of Proof, MKM): Detective tribal payoff with two
  // distinct references in one card — gating anthem and blocker-restriction.
  it('detective matches MKM tribal references', () => {
    const d = rules.find((r) => r.id === 'condition.cares_tribe.detective')!;
    expect(d.match("enchanted creature gets +2/+2 as long as it's a detective you control")).toBeTruthy();
    expect(d.match("can't block detectives")).toBeTruthy();
  });

  // v0.16 — Bloomburrow tribes. Mouse uses irregular plural "mice".
  it('mouse matches both "mouse" and "mice" plural', () => {
    const m = rules.find((r) => r.id === 'condition.cares_tribe.mouse')!;
    expect(m.match('mice you control gain +1/+1')).toBeTruthy();
    expect(m.match('this mouse gains haste')).toBeTruthy();
    expect(m.match('create a 1/1 white mouse creature token')).toBe(false); // strip
  });

  it('bat does not false-match on "battle" or "combat"', () => {
    const b = rules.find((r) => r.id === 'condition.cares_tribe.bat')!;
    expect(b.match('whenever this creature attacks during combat, draw a card')).toBe(false);
    expect(b.match('whenever a battle enters')).toBe(false);
    expect(b.match('bats you control have flying')).toBeTruthy();
  });

  it('raccoon and squirrel match BLB tribal payoffs', () => {
    const r = rules.find((r) => r.id === 'condition.cares_tribe.raccoon')!;
    expect(r.match('raccoons you control get +1/+1 and gain vigilance until end of turn')).toBeTruthy();
    const s = rules.find((r) => r.id === 'condition.cares_tribe.squirrel')!;
    expect(s.match('whenever another squirrel you control enters, you gain 1 life')).toBeTruthy();
  });

  // v0.17 — wolf irregular plural and wolf-tribe payoffs (Tolsimir, Voja).
  it('wolf matches both "wolf" and "wolves" plural', () => {
    const w = rules.find((r) => r.id === 'condition.cares_tribe.wolf')!;
    expect(w.match('wolves you control get +1/+1')).toBeTruthy();
    expect(w.match('whenever a wolf you control attacks, draw a card')).toBeTruthy();
    // Token framing strip — "create a Wolf creature token" alone should not match.
    expect(w.match('create a 5/5 green wolf creature token')).toBe(false);
  });

  // v0.22.0 — Possessed Goat: "it becomes a black Demon in addition to its
  // other colors and types" is self-typing transformation, NOT a Demon
  // tribal payoff. The strip must remove the becomes-tribe clause anchored
  // on the "in addition to its other [colors|types|colors and types]" tail,
  // which only appears in self-typing transformations. Coexists with the
  // existing BECOMES_CREATURE strip (which handles manland self-animation
  // ending in "creature").
  it('demon does NOT match "becomes a <Demon> in addition to its other colors and types" self-typing', () => {
    const dm = rules.find((r) => r.id === 'condition.cares_tribe.demon')!;
    expect(dm.match('{3}, discard a card: put three +1/+1 counters on this creature and it becomes a black demon in addition to its other colors and types. activate only once.')).toBe(false);
  });

  // 2026-06-01 audit Group 5 — Skyknight Squire: "it has flying and is a
  // knight in addition to its other types" — self-typing with the verb `is`
  // (rather than `becomes`). Same anchor on "in addition to its other types"
  // tail; just add `is` to the verb slot. Mirrors the Possessed Goat strip.
  it('knight does NOT match "is a <Knight> in addition to its other types" self-typing', () => {
    const k = rules.find((r) => r.id === 'condition.cares_tribe.knight')!;
    expect(k.match('whenever another creature you control enters, put a +1/+1 counter on this creature. as long as this creature has three or more +1/+1 counters on it, it has flying and is a knight in addition to its other types.')).toBe(false);
  });

  it('manland self-animation still strips correctly (Vampire becomes manland)', () => {
    // Manland-style: "becomes a 1/1 vampire creature" — handled by existing
    // BECOMES_CREATURE strip. Adding the tribe-tail strip must not break this.
    const v = rules.find((r) => r.id === 'condition.cares_tribe.vampire')!;
    expect(v.match('target land becomes a 1/1 vampire creature with flying until end of turn')).toBe(false);
  });

  // 2026-06-02 audit batch — ability-word headers MUST be stripped before
  // matching so the words in `Goblin Formula — ...` / `Dinosaur Formula — ...`
  // don't FP cares_tribe.<X>. The strip targets sentence-leading "1-5 token
  // — " segments (an ability-word header).
  it('goblin does NOT match ability-word header "Goblin Formula — ..." alone (Norman Osborn)', () => {
    const g = rules.find((r) => r.id === 'condition.cares_tribe.goblin')!;
    expect(
      g.match("norman osborn can't be blocked. whenever norman osborn deals combat damage to a player, he connives. {1}{u}{b}{r}: transform norman osborn. activate only as a sorcery. flying, menace spells you cast from your graveyard cost {2} less to cast. goblin formula — each nonland card in your graveyard has mayhem. the mayhem cost is equal to its mana cost."),
    ).toBe(false);
  });

  it('dinosaur does NOT match ability-word header "Dinosaur Formula — ..." alone (Stegron)', () => {
    const d = rules.find((r) => r.id === 'condition.cares_tribe.dinosaur')!;
    expect(
      d.match("menace dinosaur formula — {1}{r}, discard this card: until end of turn, target creature you control gets +3/+1 and becomes a dinosaur in addition to its other types."),
    ).toBe(false);
  });

  // 2026-06-02 audit batch — type-graft contractions (Xu-Ifit / Superior
  // Spider-Man): "it's a Skeleton in addition to its other types" and "he's
  // a 4/4 spider human hero in addition to his other types" are self-typing
  // transformations using contractions (`'s`) and gendered possessives
  // (`his|her|their`). The becomesTribePattern strip must admit them.
  it('skeleton does NOT match "it\'s a skeleton in addition to its other types" (Xu-Ifit)', () => {
    const s = rules.find((r) => r.id === 'condition.cares_tribe.skeleton')!;
    expect(
      s.match("{t}: return target creature card from your graveyard to the battlefield. it's a skeleton in addition to its other types and has no abilities. activate only as a sorcery."),
    ).toBe(false);
  });

  it('human does NOT match "he\'s a 4/4 spider human hero in addition to his other types" (Superior Spider-Man)', () => {
    const h = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(
      h.match("mind swap — you may have __self__ enter as a copy of any creature card in a graveyard, except his name is __self__ and he's a 4/4 spider human hero in addition to his other types. when you do, exile that card."),
    ).toBe(false);
  });

  // Sanity — genuine tribal references inside an ability-word BODY still
  // fire (the body references the subtype as a payoff).
  it('food still matches "food formula — sacrifice a food" body (ability-word body references subtype)', () => {
    // (The body of an ability-word can still reference the tribe/subtype as
    // a payoff; only the HEADER token is stripped.)
    // Note: this test sits in cares_tribe but no canonical tribe-formula body
    // exists with a leading ability-word that we ship. Skipped sanity — the
    // cares_subtype test covers a real subtype-formula case. Kept here so
    // future ability-word triggers don't accidentally over-strip.
  });

  // v0.39.0 — 200-card audit Ship 10. Aura/Equipment type-grant frames:
  // "(enchanted|equipped) creature ... is a <Tribe> in addition to its other
  // types" — Angelic Destiny, Astrologian's Planisphere, Avatar Destiny, and
  // ~22 more grant the named tribal type to the subject creature, which is
  // a tribal payoff. The new typeGrantRe arm fires BEFORE the becomesTribe
  // strip so the type-grant clause matches positively; Skyknight Squire and
  // Possessed Goat anchor on "it" (self-subject), so the strip still rejects
  // them.
  it('angel matches "enchanted creature is an angel in addition to its other types" (Aura type-grant)', () => {
    const a = rules.find((r) => r.id === 'condition.cares_tribe.angel')!;
    // Angelic Destiny verbatim normalized text.
    expect(
      a.match("enchant creature enchanted creature gets +4/+4, has flying and first strike, and is an angel in addition to its other types. when enchanted creature dies, return this card to its owner's hand."),
    ).toBeTruthy();
    expect(
      a.match('enchanted creature is an angel in addition to its other types and gets +2/+2.'),
    ).toBeTruthy();
  });

  it('wizard matches "equipped creature is a wizard in addition to its other types" (Equipment type-grant)', () => {
    const w = rules.find((r) => r.id === 'condition.cares_tribe.wizard')!;
    expect(
      w.match('equipped creature gets +1/+1 and is a wizard in addition to its other types.'),
    ).toBeTruthy();
  });

  it('spirit / cat / dog / angel / demon FP-resistant on substrings', () => {
    const sp = rules.find((r) => r.id === 'condition.cares_tribe.spirit')!;
    expect(sp.match('this creature has spiritual energy')).toBe(false); // 'spiritual'
    expect(sp.match('spirits you control have flying')).toBeTruthy();
    const c = rules.find((r) => r.id === 'condition.cares_tribe.cat')!;
    expect(c.match('this card is in the cathedral category')).toBe(false); // 'cathedral' / 'category'
    expect(c.match('cats you control gain lifelink')).toBeTruthy();
    const dg = rules.find((r) => r.id === 'condition.cares_tribe.dog')!;
    expect(dg.match('a dogged pursuit reveals dogma')).toBe(false); // 'dogged' / 'dogma'
    expect(dg.match('dogs you control get +1/+1')).toBeTruthy();
    const an = rules.find((r) => r.id === 'condition.cares_tribe.angel')!;
    expect(an.match('this creature has angelic grace')).toBe(false); // 'angelic'
    expect(an.match('angels you control have vigilance')).toBeTruthy();
    const dm = rules.find((r) => r.id === 'condition.cares_tribe.demon')!;
    expect(dm.match('a demonic display of power')).toBe(false); // 'demonic'
    expect(dm.match('demons you control have menace')).toBeTruthy();
  });

  // v0.47.0 — Otherworldly Escort: "it's a spirit detective" (subtype frame
  // without "in addition to" tail). The selfBecomesTribe strip should remove
  // this clause so cares_tribe.spirit does not fire on the type-grant alone.
  it('spirit does NOT match "it\'s a spirit detective" no-tail self-typing (Otherworldly Escort)', () => {
    const sp = rules.find((r) => r.id === 'condition.cares_tribe.spirit')!;
    expect(sp.match("it's a spirit detective.")).toBe(false);
  });

  // v0.47.0 — Figure of Fable: "this creature becomes a kithkin scout."
  // Self-type-change without the "in addition to" tail.
  it('kithkin does NOT match "this creature becomes a kithkin scout" no-tail self-typing (Figure of Fable)', () => {
    const k = rules.find((r) => r.id === 'condition.cares_tribe.kithkin')!;
    expect(k.match("this creature becomes a kithkin scout.")).toBe(false);
  });

  // Sanity: Aura/Equipment type-grant (enchanted|equipped creature) still
  // fires positively even after the new selfBecomesTribe strip.
  it('spirit still matches "enchanted creature is a spirit in addition to its other types" (Aura type-grant)', () => {
    const sp = rules.find((r) => r.id === 'condition.cares_tribe.spirit')!;
    expect(sp.match('enchanted creature is a spirit in addition to its other types.')).toBeTruthy();
  });
});
