export type FamilyId =
  | 'destruction'
  | 'counter-magic'
  | 'bounce-blink'
  | 'resources'
  | 'tribes'
  | 'spellslinger'
  | 'card-selection'
  | 'tap-untap-steal'
  | 'lifegain'
  | 'themes'
  | 'set-mechanics'
  | 'keywords';

export type FamilyDef = {
  id: FamilyId;
  label: string;
  color: string;
  description: string;
};

export const FAMILIES: FamilyDef[] = [
  { id: 'destruction',     label: 'Destruction',         color: '#ef4444', description: 'Board wipes, targeted removal, sacrifice, damage, and leaves-battlefield triggers' },
  { id: 'counter-magic',   label: 'Counter-magic',       color: '#a855f7', description: 'Counterspells and spell-cast triggers that interact with them' },
  { id: 'bounce-blink',    label: 'Bounce / Blink',      color: '#06b6d4', description: 'Return permanents to hand, or exile and return them to the battlefield' },
  { id: 'resources',       label: 'Resources',           color: '#22c55e', description: 'Mana ramp, tokens, treasure, food, clues, manlands, extra land drops' },
  { id: 'tribes',          label: 'Tribes',              color: '#ec4899', description: 'Creature-type-matters effects and tribal payoffs' },
  { id: 'spellslinger',    label: 'Spellslinger',        color: '#0ea5e9', description: 'Instant/sorcery payoffs, cast triggers, copy spells, cost reduction' },
  { id: 'card-selection',  label: 'Card Selection',      color: '#eab308', description: 'Draw, discard, scry, surveil, mill, and tutors' },
  { id: 'tap-untap-steal', label: 'Tap/Untap & Steal',   color: '#84cc16', description: 'Tap and untap effects, control change, copy permanents, pacify' },
  { id: 'lifegain',        label: 'Lifegain',            color: '#f97316', description: 'Life total changes and lifegain payoffs' },
  { id: 'themes',          label: 'Archetype Themes',    color: '#a3a3a3', description: 'Archetype payoffs: graveyard, artifacts, enchantments, lands, reanimator, ETB triggers' },
  { id: 'set-mechanics',   label: 'Set Mechanics',       color: '#14b8a6', description: 'Recent-set keyword mechanics: kicker, plot, warp, bending, gift, harmonize, prepared' },
  { id: 'keywords',        label: 'Keyword Properties',  color: '#64748b', description: 'Evergreen ability keywords: flying, trample, deathtouch, +1/+1 counters, and more' },
];

const FAMILY_BY_ID = new Map(FAMILIES.map((f) => [f.id, f]));

const TAG_TO_FAMILY: Record<string, FamilyId> = {
  // destruction
  'effect.board_wipe': 'destruction',
  'effect.causes_damage': 'destruction',
  'effect.deals_damage': 'destruction',
  'effect.debuff_minus_n': 'destruction',
  'effect.destroy_artifact': 'destruction',
  'effect.destroy_creature': 'destruction',
  'effect.destroy_enchantment': 'destruction',
  'effect.destroy_land': 'destruction',
  'effect.destroy_permanent': 'destruction',
  'effect.destroy_planeswalker': 'destruction',
  'effect.edict': 'destruction',
  'effect.exile_artifact': 'destruction',
  'effect.exile_creature': 'destruction',
  'effect.exile_enchantment': 'destruction',
  'effect.exile_from_battlefield': 'destruction',
  'effect.exile_from_graveyard': 'destruction',
  'effect.exile_land': 'destruction',
  'effect.exile_planeswalker': 'destruction',
  'effect.fight': 'destruction',
  'effect.sacrifice_artifact': 'destruction',
  'effect.sacrifice_creature': 'destruction',
  'effect.sacrifice_enchantment': 'destruction',
  'effect.sacrifice_land': 'destruction',
  'effect.sacrifice_permanent': 'destruction',
  'effect.sacrifice_planeswalker': 'destruction',
  'effect.prevent_damage': 'destruction',
  'effect.amplifies_damage_or_lifeloss': 'destruction',
  'effect.loses_abilities': 'destruction',
  'trigger.artifact_leaves_battlefield': 'destruction',
  'trigger.creature_dies': 'destruction',
  'trigger.creature_leaves_battlefield': 'destruction',
  'trigger.damage_dealt': 'destruction',
  'trigger.enchantment_leaves_battlefield': 'destruction',
  'trigger.land_leaves_battlefield': 'destruction',
  'trigger.permanent_leaves_battlefield': 'destruction',
  'trigger.permanent_sacrificed': 'destruction',
  'trigger.planeswalker_leaves_battlefield': 'destruction',

  // counter-magic
  'effect.counterspell': 'counter-magic',
  'effect.silence_opponents': 'counter-magic',
  'trigger.commit_a_crime': 'counter-magic',

  // bounce-blink
  'effect.bounce_artifact': 'bounce-blink',
  'effect.bounce_creature': 'bounce-blink',
  'effect.bounce_enchantment': 'bounce-blink',
  'effect.bounce_land': 'bounce-blink',
  'effect.bounce_or_blink': 'bounce-blink',
  'effect.bounce_planeswalker': 'bounce-blink',
  'effect.tuck_to_library': 'bounce-blink',
  'effect.blink': 'bounce-blink',
  'effect.flicker': 'bounce-blink',

  // resources
  'effect.add_mana': 'resources',
  'effect.animate_land': 'resources',
  'effect.create_clue': 'resources',
  'effect.create_creature_token': 'resources',
  'effect.create_food': 'resources',
  'effect.create_map': 'resources',
  'effect.create_role': 'resources',
  'effect.create_token': 'resources',
  'effect.create_treasure': 'resources',
  'effect.is_manland': 'resources',
  'effect.land_enters_tapped_conditional': 'resources',
  'effect.play_extra_land': 'resources',
  'effect.ramp_nonland': 'resources',
  'effect.tutors_basic_land': 'resources',
  'effect.tutors_land': 'resources',
  'condition.cares_tokens': 'resources',
  'trigger.token_created': 'resources',

  // tribes
  'condition.cares_islands': 'tribes',
  'condition.cares_subtype': 'tribes',
  'condition.cares_tribe': 'tribes',
  'effect.land_becomes_island': 'tribes',

  // spellslinger
  'condition.cares_instant_sorcery_in_graveyard': 'spellslinger',
  'condition.cares_noncreature_spell': 'spellslinger',
  'effect.cast_for_free': 'spellslinger',
  'effect.cast_from_exile': 'spellslinger',
  'effect.cast_noncreature_spell': 'spellslinger',
  'effect.copy_spell': 'spellslinger',
  'effect.cost_reduction': 'spellslinger',
  'effect.is_instant_or_sorcery': 'spellslinger',
  'trigger.spell_cast': 'spellslinger',
  'condition.cares_spells_cast_this_turn': 'spellslinger',

  // card-selection
  'effect.draws_or_discards': 'card-selection',
  'effect.exile_from_library': 'card-selection',
  'effect.impulse_draw': 'card-selection',
  'effect.look_at_top_n': 'card-selection',
  'effect.mill': 'card-selection',
  'effect.scry': 'card-selection',
  'effect.surveil': 'card-selection',
  'effect.targeted_discard': 'card-selection',
  'effect.tutor_any': 'card-selection',
  'effect.tutors_artifact': 'card-selection',
  'effect.tutors_creature': 'card-selection',
  'effect.tutors_instant_sorcery': 'card-selection',
  'effect.tutors_subtype': 'card-selection',
  'trigger.card_drawn_discarded': 'card-selection',
  'condition.cares_hand_size': 'card-selection',

  // tap-untap-steal
  'effect.cant_block_until_eot': 'tap-untap-steal',
  'effect.control_change': 'tap-untap-steal',
  'effect.clone_in_place': 'tap-untap-steal',
  'effect.copy_permanent_token': 'tap-untap-steal',
  'effect.donate': 'tap-untap-steal',
  'effect.pacify': 'tap-untap-steal',
  'effect.stun_counter': 'tap-untap-steal',
  'effect.tap': 'tap-untap-steal',
  'effect.untap': 'tap-untap-steal',
  'trigger.tapped_or_untapped': 'tap-untap-steal',

  // lifegain
  'condition.cares_lifegain': 'lifegain',
  'condition.cares_lifeloss': 'lifegain',
  'effect.life_changed': 'lifegain',
  'trigger.life_changed': 'lifegain',
  'effect.drain': 'lifegain',
  'effect.cant_lose': 'lifegain',
  'effect.prevent_lifegain': 'lifegain',
  // Poison axis — co-located with lifegain alongside effect.cant_lose since
  // the poison-counter lose-the-game gate is a sibling alt-loss condition.
  'effect.give_poison_counters': 'lifegain',
  'condition.cares_poison': 'lifegain',

  // themes
  'condition.adventure_matters': 'themes',
  'condition.bargain': 'themes',
  'condition.cares_activated_abilities': 'themes',
  'condition.reduces_activated_mana_cost': 'themes',
  'condition.cares_artifacts': 'themes',
  'condition.cares_cards_drawn_this_turn': 'themes',
  'condition.cares_creatures_died_this_turn': 'themes',
  'condition.cares_enchantments': 'themes',
  'condition.cares_exile_pile': 'themes',
  'condition.cares_graveyard': 'themes',
  'condition.cares_high_mana_value': 'themes',
  'condition.cares_high_power': 'themes',
  'condition.cares_lands': 'themes',
  'condition.cares_low_mana_value': 'themes',
  'condition.cares_low_power': 'themes',
  'condition.cast_from_graveyard': 'themes',
  'effect.grants_cast_from_graveyard': 'themes',
  'effect.alt_win_condition': 'themes',
  'effect.has_leyline': 'themes',
  'condition.has_x_in_cost': 'themes',
  'effect.adventure_card': 'themes',
  'effect.cast_from_library_top': 'themes',
  'effect.cheat_into_play': 'themes',
  'effect.reanimate': 'themes',
  'effect.return_from_graveyard_to_hand': 'themes',
  'trigger.another_artifact_etb': 'themes',
  'trigger.another_creature_etb': 'themes',
  'trigger.another_enchantment_etb': 'themes',
  'trigger.beginning_of_combat': 'themes',
  'trigger.beginning_of_end_step': 'themes',
  'trigger.upkeep': 'themes',
  'trigger.landfall': 'themes',
  'trigger.creature_leaves_graveyard': 'themes',
  'trigger.self_etb': 'themes',
  'condition.cares_planeswalkers': 'themes',
  'condition.cares_excess_damage': 'themes',
  'effect.amplifies_triggers': 'themes',
  'condition.cares_colors_among_permanents': 'themes',
  'condition.threshold': 'themes',

  // set-mechanics
  'condition.cares_bending': 'set-mechanics',
  'condition.cares_suspected': 'set-mechanics',
  'condition.celebration': 'set-mechanics',
  'condition.teamwork': 'set-mechanics',
  'condition.descend': 'set-mechanics',
  'condition.evidence_collected': 'set-mechanics',
  'effect.collect_evidence': 'set-mechanics',
  'effect.cloak': 'set-mechanics',
  'effect.discover': 'set-mechanics',
  'effect.explore': 'set-mechanics',
  'effect.has_airbend': 'set-mechanics',
  'effect.has_disguise': 'set-mechanics',
  'effect.has_earthbend': 'set-mechanics',
  'effect.has_firebending': 'set-mechanics',
  'effect.has_gift': 'set-mechanics',
  'trigger.gift_promised': 'set-mechanics',
  'condition.gift_promised': 'set-mechanics',
  'effect.has_harmonize': 'set-mechanics',
  'effect.has_kicker': 'set-mechanics',
  'effect.has_plot': 'set-mechanics',
  'effect.has_prepared': 'set-mechanics',
  'effect.has_warp': 'set-mechanics',
  'effect.has_waterbend': 'set-mechanics',
  'effect.has_web_slinging': 'set-mechanics',
  'effect.is_room': 'set-mechanics',
  'effect.suspect': 'set-mechanics',
  'effect.unsuspect': 'set-mechanics',
  'trigger.collected_evidence': 'set-mechanics',
  'trigger.discovered': 'set-mechanics',
  'trigger.explored': 'set-mechanics',
  'trigger.turned_face_up': 'set-mechanics',
  // Bloomburrow mechanics.
  'condition.valiant': 'set-mechanics',
  'trigger.expend': 'set-mechanics',
  'effect.has_offspring': 'set-mechanics',
  'effect.forage': 'set-mechanics',
  // OTJ Mount / Saddle mechanic.
  'effect.has_saddle': 'set-mechanics',
  // Khans-revisit Raid ability word (resurfaces in OTJ and recent Standard).
  'condition.raid': 'set-mechanics',
  // OTJ Spree / Outlaw mechanics.
  'effect.has_spree': 'set-mechanics',
  'condition.cares_outlaws': 'set-mechanics',
  // Khans-era ability words.
  'condition.converge': 'set-mechanics',
  // Strixhaven / DSK ability words.
  'condition.repartee': 'set-mechanics',
  // FIN / EOE ability words and mechanics.
  'condition.opus': 'set-mechanics',
  'condition.infusion': 'set-mechanics',
  'condition.void': 'set-mechanics',
  'effect.has_exhaust': 'set-mechanics',
  'effect.has_sneak': 'set-mechanics',
  'effect.has_renew': 'set-mechanics',
  'effect.has_job_select': 'set-mechanics',
  // v0.24 — DSK Mobilize, EOE Station, TDM Behold a Dragon, Lorwyn-revisit
  // Wither/Persist, Avatar Blight, MTG-evergreen Convoke/Changeling.
  'effect.has_mobilize': 'set-mechanics',
  'effect.has_station': 'set-mechanics',
  'effect.has_behold': 'set-mechanics',
  'effect.has_wither': 'set-mechanics',
  'effect.has_persist': 'set-mechanics',
  'effect.has_blight': 'set-mechanics',
  'effect.has_convoke': 'set-mechanics',
  'effect.has_changeling': 'set-mechanics',
  // DSK Endure keyword action.
  'effect.endure': 'set-mechanics',
  // Energy counter mechanic.
  'effect.produces_energy': 'set-mechanics',
  'condition.cares_energy': 'set-mechanics',
  // Theros devotion (parametric parent).
  'condition.devotion': 'set-mechanics',
  // Warp-cares payoff axis.
  'condition.cares_warped': 'set-mechanics',
  // MSH Power-up mechanic.
  'condition.power_up': 'set-mechanics',
  // Legendary-matters payoff.
  'condition.cares_legendary': 'tribes',

  // keywords
  'condition.cares_deathtouch': 'keywords',
  'condition.cares_evasion': 'keywords',
  'condition.cares_plus_one_counter': 'keywords',
  'effect.counter_modified': 'keywords',
  'effect.gains_keyword_self_conditional': 'keywords',
  'effect.grants_evasion': 'keywords',
  'effect.grants_flash': 'keywords',
  'effect.grants_stat_buff': 'keywords',
  'effect.has_activated_ability': 'keywords',
  'effect.has_mana_activated_ability': 'keywords',
  'effect.has_cycling': 'keywords',
  'effect.has_deathtouch': 'keywords',
  'effect.has_defender': 'keywords',
  'effect.grants_deathtouch': 'keywords',
  'effect.grants_double_strike': 'keywords',
  'effect.grants_first_strike': 'keywords',
  'effect.grants_haste': 'keywords',
  'effect.grants_hexproof': 'keywords',
  'effect.grants_indestructible': 'keywords',
  'effect.grants_lifelink': 'keywords',
  'effect.grants_prowess': 'keywords',
  'effect.grants_reach': 'keywords',
  'effect.grants_trample': 'keywords',
  'effect.grants_vigilance': 'keywords',
  'effect.unblockable': 'keywords',
  'effect.partial_unblockable': 'keywords',
  'effect.grants_protection': 'keywords',
  'effect.has_protection': 'keywords',
  'effect.has_double_strike': 'keywords',
  'effect.has_first_strike': 'keywords',
  'effect.has_flash': 'keywords',
  'effect.has_flying': 'keywords',
  'effect.has_haste': 'keywords',
  'effect.has_hexproof': 'keywords',
  'effect.has_indestructible': 'keywords',
  'effect.has_lifelink': 'keywords',
  'effect.has_menace': 'keywords',
  'effect.has_prowess': 'keywords',
  'effect.has_reach': 'keywords',
  'effect.has_trample': 'keywords',
  'effect.has_vigilance': 'keywords',
  'effect.has_ward': 'keywords',
  'effect.has_toxic': 'keywords',
  'effect.plus_one_counter': 'keywords',
  'trigger.attack_or_block': 'keywords',
  'trigger.counter_changed': 'keywords',
  // v0.45.0 — new rules
  'effect.proliferate': 'keywords',
  'effect.attack_tax': 'destruction',
  'trigger.surveil': 'card-selection',
};

/**
 * Resolves a tagId to its visual family. For parametric tag ids generated at
 * runtime (e.g. `condition.cares_subtype.dragon`), falls back by stripping
 * suffixes after each `.` until a parent matches.
 */
export function familyFor(tagId: string): FamilyDef | undefined {
  const direct = TAG_TO_FAMILY[tagId];
  if (direct) return FAMILY_BY_ID.get(direct);

  let probe = tagId;
  while (true) {
    const lastDot = probe.lastIndexOf('.');
    if (lastDot <= 0) return undefined;
    probe = probe.slice(0, lastDot);
    const hit = TAG_TO_FAMILY[probe];
    if (hit) return FAMILY_BY_ID.get(hit);
  }
}
