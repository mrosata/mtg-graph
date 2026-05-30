import { describe, it, expect } from 'vitest';
import { getTagCatalog } from './catalog';
import { getAllRules } from './rules';

describe('tag catalog', () => {
  it('every rule id is in the catalog', () => {
    const catalogIds = new Set(getTagCatalog().map((t) => t.tagId));
    for (const rule of getAllRules()) {
      expect(catalogIds.has(rule.id), `rule ${rule.id} missing from catalog`).toBe(true);
    }
  });

  it('every catalog axis matches its rule axis', () => {
    const rulesById = new Map(getAllRules().map((r) => [r.id, r]));
    for (const tag of getTagCatalog()) {
      const rule = rulesById.get(tag.tagId);
      if (rule) expect(tag.axis).toBe(rule.axis);
    }
  });

  it('every pairsWith reference resolves to a catalog entry', () => {
    const catalogIds = new Set(getTagCatalog().map((t) => t.tagId));
    for (const tag of getTagCatalog()) {
      for (const entry of tag.pairsWith) {
        const partnerId = typeof entry === 'string' ? entry : entry.tagId;
        expect(catalogIds.has(partnerId), `${tag.tagId} pairs with unknown ${partnerId}`).toBe(true);
        if (typeof entry === 'object') {
          for (const reqId of entry.requiresOnSource ?? []) {
            expect(catalogIds.has(reqId), `${tag.tagId} requiresOnSource references unknown ${reqId}`).toBe(true);
          }
          for (const reqId of entry.requiresOnTarget ?? []) {
            expect(catalogIds.has(reqId), `${tag.tagId} requiresOnTarget references unknown ${reqId}`).toBe(true);
          }
        }
      }
    }
  });

  it('effects only pair with triggers and vice versa', () => {
    const tagsById = new Map(getTagCatalog().map((t) => [t.tagId, t]));
    for (const tag of getTagCatalog()) {
      for (const entry of tag.pairsWith) {
        const partnerId = typeof entry === 'string' ? entry : entry.tagId;
        const other = tagsById.get(partnerId);
        if (!other) continue;
        expect(other.axis).not.toBe(tag.axis);
      }
    }
  });
});

describe('TagDef.children consistency', () => {
  const byId = new Map(getTagCatalog().map((d) => [d.tagId, d] as const));

  it('every child id referenced in a parent.children list exists in the catalog', () => {
    for (const def of getTagCatalog()) {
      if (!def.children) continue;
      for (const childId of def.children) {
        expect(byId.has(childId), `${def.tagId} declares child ${childId} which is not in the catalog`).toBe(true);
      }
    }
  });

  it('children do not themselves declare children (single-level expansion only)', () => {
    for (const def of getTagCatalog()) {
      if (!def.children) continue;
      for (const childId of def.children) {
        const child = byId.get(childId);
        expect(child?.children, `${childId} (a child of ${def.tagId}) must not have its own children`).toBeFalsy();
      }
    }
  });
});
