// pipeline/rules/index.ts
import type { Rule } from './types';
import { aggregateRulesSync } from './aggregator';

export { aggregateRules as allRulesAsync, ensureWarmed } from './aggregator';

/**
 * Returns the aggregated rule list. Requires the aggregator to be warmed
 * (`await ensureWarmed()`) — otherwise throws. Use this from sync code paths
 * instead of importing a top-level array, so the warm-up requirement is
 * visible at the call site.
 */
export function getAllRules(): Rule[] {
  return aggregateRulesSync();
}
