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
      // v0.20 — typed-suppression. If the parent's evidence explicitly excludes
      // a permanent type via `non<type>` (e.g. "exile target nonland
      // permanent"), don't emit the typed child for that type. Generalizes
      // across `_creature`, `_artifact`, `_enchantment`, `_planeswalker`, and
      // `_land`. Season of the Burrow is the canonical regression — its
      // "exile target nonland permanent" evidence on an effect.exile_*
      // parent was leaking into effect.exile_land children. The check is on
      // the trailing `_<type>` segment of childId, matched against `\bnon<type>\b`
      // in the parent evidence (case-insensitive).
      const childType = childId.match(/_(creature|artifact|enchantment|planeswalker|land)$/)?.[1];
      if (childType) {
        const nonRe = new RegExp(`\\bnon${childType}\\b`, 'i');
        if (tag.evidence && nonRe.test(tag.evidence)) continue;
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
