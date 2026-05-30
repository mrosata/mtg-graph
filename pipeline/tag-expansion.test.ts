import { describe, it, expect } from 'vitest';
import type { CardTag, TagDef } from '../shared/types';
import { expandChildren } from './tag-expansion';

const catalog: Record<string, TagDef> = {
  'effect.destroy_permanent': {
    tagId: 'effect.destroy_permanent',
    axis: 'effect',
    label: 'Destroys any permanent',
    description: '',
    pairsWith: [],
    children: [
      'effect.destroy_creature',
      'effect.destroy_artifact',
      'effect.destroy_enchantment',
      'effect.destroy_planeswalker',
      'effect.destroy_land',
    ],
  },
  'effect.destroy_creature': {
    tagId: 'effect.destroy_creature', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_artifact': {
    tagId: 'effect.destroy_artifact', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_enchantment': {
    tagId: 'effect.destroy_enchantment', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_planeswalker': {
    tagId: 'effect.destroy_planeswalker', axis: 'effect', label: '', description: '', pairsWith: [],
  },
  'effect.destroy_land': {
    tagId: 'effect.destroy_land', axis: 'effect', label: '', description: '', pairsWith: [],
  },
};

describe('expandChildren', () => {
  it('adds typed children for a parent tag with inherited evidence', () => {
    const tags: CardTag[] = [
      { tagId: 'effect.destroy_permanent', axis: 'effect', evidence: 'destroy target permanent' },
    ];
    const expanded = expandChildren(tags, catalog);
    const ids = expanded.map((t) => t.tagId).sort();
    expect(ids).toEqual([
      'effect.destroy_artifact',
      'effect.destroy_creature',
      'effect.destroy_enchantment',
      'effect.destroy_land',
      'effect.destroy_permanent',
      'effect.destroy_planeswalker',
    ]);
    const artifactTag = expanded.find((t) => t.tagId === 'effect.destroy_artifact');
    expect(artifactTag?.evidence).toBe('destroy target permanent');
  });

  it('dedupes when a child was already matched directly', () => {
    const tags: CardTag[] = [
      { tagId: 'effect.destroy_permanent', axis: 'effect', evidence: 'destroy target permanent' },
      { tagId: 'effect.destroy_creature', axis: 'effect', evidence: 'destroy target creature' },
    ];
    const expanded = expandChildren(tags, catalog);
    const creatureTags = expanded.filter((t) => t.tagId === 'effect.destroy_creature');
    expect(creatureTags).toHaveLength(1);
    expect(creatureTags[0]?.evidence).toBe('destroy target creature');
  });

  it('is a no-op when no parent has children', () => {
    const tags: CardTag[] = [
      { tagId: 'effect.destroy_creature', axis: 'effect', evidence: 'destroy target creature' },
    ];
    const expanded = expandChildren(tags, catalog);
    expect(expanded).toEqual(tags);
  });

  it('does not recurse into children-of-children', () => {
    const nestedCatalog: Record<string, TagDef> = {
      'a.parent': { tagId: 'a.parent', axis: 'effect', label: '', description: '', pairsWith: [], children: ['a.child'] },
      'a.child': { tagId: 'a.child', axis: 'effect', label: '', description: '', pairsWith: [], children: ['a.grandchild'] },
      'a.grandchild': { tagId: 'a.grandchild', axis: 'effect', label: '', description: '', pairsWith: [] },
    };
    const tags: CardTag[] = [{ tagId: 'a.parent', axis: 'effect', evidence: 'p' }];
    const expanded = expandChildren(tags, nestedCatalog);
    const ids = expanded.map((t) => t.tagId).sort();
    expect(ids).toEqual(['a.child', 'a.parent']);
  });

  it('throws when a parent declares a child id missing from the catalog', () => {
    const brokenCatalog: Record<string, TagDef> = {
      'a.parent': { tagId: 'a.parent', axis: 'effect', label: '', description: '', pairsWith: [], children: ['a.missing'] },
    };
    const tags: CardTag[] = [{ tagId: 'a.parent', axis: 'effect', evidence: 'p' }];
    expect(() => expandChildren(tags, brokenCatalog)).toThrow(
      /a\.parent.*a\.missing/,
    );
  });
});
