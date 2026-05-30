// pipeline/tag-expansion.ts
//
// Expand parent tags into typed child tags. Runs after `applyRules` in the
// per-card tagging step (see `pipeline/index.ts`). Single-level expansion
// only — children of children are not recursed.
//
// When a parent tag and a direct-match child both appear in the input, the
// direct match wins (its evidence is preserved). When only the parent appears,
// children inherit the parent's evidence.

import type { CardTag, TagDef } from '../shared/types';

export function expandChildren(
  tags: CardTag[],
  catalog: Record<string, TagDef>,
): CardTag[] {
  const seen = new Set(tags.map((t) => t.tagId));
  const result = [...tags];

  for (const tag of tags) {
    const def = catalog[tag.tagId];
    if (!def?.children?.length) continue;
    for (const childId of def.children) {
      if (seen.has(childId)) continue;
      const childDef = catalog[childId];
      if (!childDef) {
        throw new Error(
          `expandChildren: parent ${tag.tagId} declares child ${childId} which is not in the catalog`,
        );
      }
      seen.add(childId);
      result.push({
        tagId: childId,
        axis: childDef.axis,
        evidence: tag.evidence,
      });
    }
  }

  return result;
}
