import type { CardTag, TagDef } from '@shared/types';

/**
 * Collapses "all children present" into the parent chip.
 *
 * When a card has a parent tag AND every one of its declared children, the
 * children are redundant — the parent chip already implies them all. In that
 * case we hide the children so the parent chip stands alone.
 *
 * When only *some* children are present (e.g. Disenchant has destroy_artifact +
 * destroy_enchantment but NOT destroy_creature/_planeswalker/_land), we keep the
 * individual children chips and suppress nothing.
 */
export function collapseParentChildChips(
  tags: CardTag[],
  catalog: Map<string, TagDef>,
): CardTag[] {
  const present = new Set(tags.map((t) => t.tagId));
  const hiddenChildren = new Set<string>();

  for (const tag of tags) {
    const def = catalog.get(tag.tagId);
    if (!def?.children?.length) continue;
    // Only collapse when ALL declared children are present.
    const allChildrenPresent = def.children.every((c) => present.has(c));
    if (!allChildrenPresent) continue;
    for (const childId of def.children) hiddenChildren.add(childId);
  }

  return tags.filter((t) => !hiddenChildren.has(t.tagId));
}
