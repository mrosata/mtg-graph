import { describe, it, expect } from 'vitest';
import { rule } from './effect.bounce_creature';

describe('effect.bounce_creature', () => {
  it.each([
    ['return target creature to its owner\'s hand'],
    ['return target attacking creature to your hand'],
    ['return up to two target creatures to their owners\' hands'],
    ['return target permanent to its owner\'s hand'],
    ['return target nonland permanent to its owner\'s hand'],
    // v0.14.6 — delayed-trigger blink-back (Anzrag's Rampage): "return it to
    // your hand at the beginning of the next end step". The "it" antecedent
    // is the just-cheated-in creature; the spell's net effect is a creature
    // bounce that re-triggers ETB. NOTE: destination is HAND, not battlefield.
    ['you may put a creature card exiled this way onto the battlefield. it gains haste. return it to your hand at the beginning of the next end step'],
    // v0.14.9 — Regression (Hotshot Investigators): "up to one other target"
    // determiner. The "other" modifier excludes __SELF__ from valid targets;
    // semantically still a creature bounce.
    ["when this creature enters, return up to one other target creature to its owner's hand"],
    // v0.14.10 — Regression (Bramble Familiar // Fetch Quest, Fleeting Effigy):
    // self-bounce via "this creature" determiner. Both have an activated /
    // delayed-trigger ability that returns the card itself to its owner's
    // hand — semantically a bounce (re-triggers ETB on recast).
    ["{1}{g}, {t}, discard a card: return this creature to its owner's hand"],
    ["at the beginning of your end step, return this creature to its owner's hand"],
    // v0.20 — anaphoric "those creatures" with explicit prior target antecedent
    // (Run Away Together: "Choose two target creatures controlled by different
    // players. Return those creatures to their owners' hands.").
    ["choose two target creatures controlled by different players. return those creatures to their owners' hands."],
    // v0.20 — mass-bounce with comma-separated qualifiers (Season of Weaving:
    // "Return each nonland, nontoken permanent to its owner's hand"). The
    // filler now admits commas so the qualifier list is reached.
    ["return each nonland, nontoken permanent to its owner's hand"],
    // v0.21.0 — Get Out: "one or two target creatures and/or enchantments you
    // own to your hand". Count slot now admits "one or two" and "up to two".
    ['return one or two target creatures and/or enchantments you own to your hand'],
    // FIX 6 (BR-1) — Aetherize: singular "their owner's hand" destination on a
    // sweep. The existing PATTERN_RETURN_OWN tail required `their owners'`
    // plural form; this admits the singular template (one player's creatures
    // → one owner). Also (Arcanis the Omnipotent) self-name bounce.
    ["return all attacking creatures to their owner's hand."],
    ['{t}: draw three cards.\n{2}{u}{u}: return __self__ to its owner\'s hand.'],
    // 2026-06-01 audit Group 2 — River's Rebuke: "return all nonland permanents
    // target player controls to their owner's hand". PATTERN_BROAD tail must
    // admit singular "their owner's" (plural was already admitted via
    // "their owners'").
    ["return all nonland permanents target player controls to their owner's hand."],
    // 2026-06-01 audit batch — Marang River Regent / Sunpearl Kirin / Jill.
    // Broad-permanent bounces with "(up to )?<count> (other )?target" count
    // slot before "target nonland permanent(s)".
    ["return up to two other target nonland permanents to their owners' hands"],
    ["return up to one other target nonland permanent you control to its owner's hand"],
    ["return up to one other target nonland permanent to its owner's hand"],
    // Cactuar — self-anaphoric "return it" with "this creature" antecedent.
    ["at the beginning of your end step, if this creature didn't enter the battlefield this turn, return it to its owner's hand."],
    // v0.46.0 — Baral's Expertise: "return up to three target artifacts
    // and/or creatures to their owners' hands." The "/" in "and/or" was
    // blocked by the filler `[\w\-]+` that precedes the `creatures?` noun.
    ["return up to three target artifacts and/or creatures to their owners' hands."],
    // v0.39.0 — 200-card audit Ship 12d — Arthur, Marigold Knight. "Put a
    // creature card from among them onto the battlefield ... return that
    // creature to its owner's hand at end of combat." The "onto the
    // battlefield" antecedent binds "that creature" to the just-cheated-in
    // creature; the end-of-combat hand return is a delayed-trigger bounce.
    ["haste whenever __self__ and at least one other creature attack, look at the top six cards of your library. you may put a creature card from among them onto the battlefield tapped and attacking. put the rest on the bottom of your library in a random order. return that creature to its owner's hand at end of combat."],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['return target noncreature permanent to its owner\'s hand'],
    ['return target artifact to its owner\'s hand'],
    ['return target creature card from your graveyard'],
    ['destroy target creature'],
    // Negative for the v0.19 pronoun arm: without a "creature" antecedent in
    // the same sentence, "exile it ... return it" should NOT fire (could be
    // an artifact flicker, which has its own axis).
    ['target artifact: exile it, then return it to the battlefield under its owner\'s control'],
    // Regression (Neva, Stalked by Nightmares): "creature or enchantment card
    // from your graveyard to your hand" is graveyard recursion, not a bounce.
    ['return target creature or enchantment card from your graveyard to your hand'],
    // Regression (Coati Scavenger): "permanent card from your graveyard to
    // your hand" is graveyard recursion via PATTERN_BROAD, not a bounce.
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
    // 2026-06-01 audit Wave 2 — flicker (exile + delayed end-step return to
    // BATTLEFIELD) must NOT fire bounce_creature. These are owned by
    // `effect.flicker`. The prior PATTERN_BLINK_OWN / PATTERN_EXILE_DELAYED_RETURN
    // arms used to over-fire on these.
    // Kykar, Zephyr Awakener:
    ["exile another target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    // Charming Prince:
    ['exile another target creature you own. return it to the battlefield under your control at the beginning of the next end step.'],
    // Ennis, Debate Moderator:
    ["when ennis enters, exile up to one other target creature you control. return that card to the battlefield under its owner's control at the beginning of the next end step."],
    // 2026-06-01 audit Wave 2 — blink (exile + immediate return to
    // BATTLEFIELD) must NOT fire bounce_creature either. Owned by `effect.blink`.
    // Go Ninja Go:
    ["exile target creature you control, then return it to the battlefield under its owner's control."],
    // Companion negatives: the previously-positive blink/flicker test rows
    // are now negative — those cases are owned by the new `effect.blink` /
    // `effect.flicker` tags (separation per 2026-06-01 audit Wave 2).
    ['exile target creature, then return that creature to the battlefield under its owner\'s control'],
    ['whenever a creature you control deals combat damage to a player, you may exile it, then return it to the battlefield under its owner\'s control'],
    ['target creature you control: exile it. return it to the battlefield under its owner\'s control at the beginning of the next end step'],
    // Niko, Light of Hope — sentence-bridged flicker.
    ['{2}, {t}: exile target nonlegendary creature you control. shards you control become copies of it until the next end step. return it to the battlefield under its owner\'s control at the beginning of the next end step.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
