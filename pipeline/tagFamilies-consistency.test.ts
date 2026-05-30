import { describe, it, expect } from 'vitest';
import { getTagCatalog } from './catalog';
import { familyFor } from '../app/src/lib/tagFamilies';

describe('tagFamilies consistency with catalog', () => {
  it('every tag in the catalog resolves to a family', () => {
    // Catalog warming is handled by pipeline/test-setup.ts (see vitest.config.ts).
    const ids = getTagCatalog().map((t) => t.tagId);
    const orphans = ids.filter((id) => familyFor(id) === undefined);
    expect(orphans).toEqual([]);
  });
});
