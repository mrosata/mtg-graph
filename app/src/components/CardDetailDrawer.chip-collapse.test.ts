import { describe, it, expect } from 'vitest';
import { collapseParentChildChips } from './CardDetailDrawer.chip-collapse';
import type { CardTag, TagDef } from '@shared/types';

// ---------- helpers ----------

function makeTag(tagId: string): CardTag {
  return { tagId, axis: 'effect', evidence: 'test evidence' };
}

function makeCatalog(defs: TagDef[]): Map<string, TagDef> {
  return new Map(defs.map((d) => [d.tagId, d]));
}

const PARENT_ID = 'effect.destroy_permanent';
const CHILD_IDS = [
  'effect.destroy_creature',
  'effect.destroy_artifact',
  'effect.destroy_enchantment',
  'effect.destroy_planeswalker',
  'effect.destroy_land',
];

const parentDef: TagDef = {
  tagId: PARENT_ID,
  axis: 'effect',
  label: 'Destroys any permanent',
  description: 'Destroys any permanent type',
  pairsWith: [],
  children: CHILD_IDS,
};

const childDefs: TagDef[] = CHILD_IDS.map((id) => ({
  tagId: id,
  axis: 'effect',
  label: `Destroys a ${id.split('.').pop()}`,
  description: '',
  pairsWith: [],
}));

// ---------- tests ----------

describe('collapseParentChildChips', () => {
  it('keeps all tags when no parent tag is present', () => {
    const tags = CHILD_IDS.map(makeTag);
    const catalog = makeCatalog(childDefs);
    const result = collapseParentChildChips(tags, catalog);
    expect(result.map((t) => t.tagId)).toEqual(CHILD_IDS);
  });

  it('collapses all children into the parent when every child is present', () => {
    const tags = [makeTag(PARENT_ID), ...CHILD_IDS.map(makeTag)];
    const catalog = makeCatalog([parentDef, ...childDefs]);
    const result = collapseParentChildChips(tags, catalog);
    // Only the parent should remain.
    expect(result.map((t) => t.tagId)).toEqual([PARENT_ID]);
  });

  it('keeps individual children when only some children are present (Disenchant case)', () => {
    const partialChildIds = ['effect.destroy_artifact', 'effect.destroy_enchantment'];
    const tags = partialChildIds.map(makeTag);
    const catalog = makeCatalog([parentDef, ...childDefs]);
    const result = collapseParentChildChips(tags, catalog);
    // No collapse — parent not present and not all children present anyway.
    expect(result.map((t) => t.tagId)).toEqual(partialChildIds);
  });

  it('does not collapse when parent is present but only some children are present', () => {
    const partialChildIds = CHILD_IDS.slice(0, 3);
    const tags = [makeTag(PARENT_ID), ...partialChildIds.map(makeTag)];
    const catalog = makeCatalog([parentDef, ...childDefs]);
    const result = collapseParentChildChips(tags, catalog);
    // Parent + partial children all remain — nothing hidden.
    expect(result.map((t) => t.tagId)).toEqual([PARENT_ID, ...partialChildIds]);
  });

  it('handles unrelated tags alongside the collapsed set', () => {
    const EXTRA = 'trigger.creature_etb';
    const tags = [makeTag(PARENT_ID), ...CHILD_IDS.map(makeTag), makeTag(EXTRA)];
    const catalog = makeCatalog([parentDef, ...childDefs]);
    const result = collapseParentChildChips(tags, catalog);
    expect(result.map((t) => t.tagId)).toEqual([PARENT_ID, EXTRA]);
  });

  it('handles a tag not in the catalog without throwing', () => {
    const tags = [makeTag('effect.unknown_tag'), makeTag(PARENT_ID), ...CHILD_IDS.map(makeTag)];
    const catalog = makeCatalog([parentDef, ...childDefs]);
    const result = collapseParentChildChips(tags, catalog);
    // unknown tag stays; children collapsed.
    expect(result.map((t) => t.tagId)).toEqual(['effect.unknown_tag', PARENT_ID]);
  });

  it('handles an empty tag list', () => {
    const catalog = makeCatalog([parentDef, ...childDefs]);
    expect(collapseParentChildChips([], catalog)).toEqual([]);
  });

  it('handles an empty catalog', () => {
    const tags = CHILD_IDS.map(makeTag);
    const result = collapseParentChildChips(tags, new Map());
    expect(result.map((t) => t.tagId)).toEqual(CHILD_IDS);
  });
});
