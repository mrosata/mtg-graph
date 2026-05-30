import { describe, it, expect } from 'vitest';
import { familyFor, FAMILIES, type FamilyId } from './tagFamilies';

describe('tagFamilies', () => {
  it('exposes all 12 family definitions', () => {
    const ids = FAMILIES.map((f) => f.id);
    expect(ids).toEqual([
      'destruction', 'counter-magic', 'bounce-blink', 'resources',
      'tribes', 'spellslinger', 'card-selection', 'tap-untap-steal',
      'lifegain', 'themes', 'set-mechanics', 'keywords',
    ]);
  });

  it('every family has a non-empty label and color', () => {
    for (const f of FAMILIES) {
      expect(f.label).toMatch(/.+/);
      expect(f.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each<[string, FamilyId]>([
    ['effect.destroy_creature', 'destruction'],
    ['effect.exile_creature', 'destruction'],
    ['effect.board_wipe', 'destruction'],
    ['effect.deals_damage', 'destruction'],
    ['effect.counterspell', 'counter-magic'],
    ['effect.bounce_creature', 'bounce-blink'],
    ['effect.bounce_or_blink', 'bounce-blink'],
    ['effect.add_mana', 'resources'],
    ['effect.create_treasure', 'resources'],
    ['effect.ramp_nonland', 'resources'],
    ['condition.cares_tribe', 'tribes'],
    ['effect.copy_spell', 'spellslinger'],
    ['effect.draws_or_discards', 'card-selection'],
    ['effect.scry', 'card-selection'],
    ['effect.tutor_any', 'card-selection'],
    ['effect.tap', 'tap-untap-steal'],
    ['effect.control_change', 'tap-untap-steal'],
    ['effect.life_changed', 'lifegain'],
    ['condition.cares_lifegain', 'lifegain'],
    ['condition.cares_graveyard', 'themes'],
    ['trigger.self_etb', 'themes'],
    ['effect.has_airbend', 'set-mechanics'],
    ['effect.has_kicker', 'set-mechanics'],
    ['effect.plus_one_counter', 'keywords'],
    ['effect.has_trample', 'keywords'],
  ])('maps %s → %s', (tagId, expected) => {
    expect(familyFor(tagId)?.id).toBe(expected);
  });

  it('resolves parametric tag ids by prefix fallback', () => {
    expect(familyFor('condition.cares_subtype.dragon')?.id).toBe('tribes');
    expect(familyFor('condition.cares_tribe.human')?.id).toBe('tribes');
    expect(familyFor('effect.tutors_subtype.equipment')?.id).toBe('card-selection');
  });

  it('returns undefined for unknown tag ids', () => {
    expect(familyFor('effect.this_does_not_exist')).toBeUndefined();
    expect(familyFor('totally_unrelated')).toBeUndefined();
  });
});
