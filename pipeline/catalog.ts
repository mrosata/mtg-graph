// pipeline/catalog.ts
import type { TagDef } from '../shared/types';
import { aggregateTagDefsSync } from './rules/aggregator';

export { RULE_VERSION } from '../shared/version';

/**
 * Returns the aggregated tag catalog. Requires the aggregator to be warmed
 * (`await ensureWarmed()`) — otherwise throws. Use this from sync code paths
 * instead of importing a top-level array, so the warm-up requirement is
 * visible at the call site.
 */
export function getTagCatalog(): TagDef[] {
  return aggregateTagDefsSync();
}
