// pipeline/rules/runner.ts
import type { Card, CardTag } from '../../shared/types';
import type { Rule, TagMatch } from './types';

export interface ApplyRulesOpts {
  /** Only run text-regex matching; skip matchCard fallback entirely. */
  textOnly?: boolean;
  /** Only run matchCard; skip text-regex matching entirely. */
  matchCardOnly?: boolean;
}

export function applyRules(
  normalizedText: string,
  card: Card,
  rules: Rule[],
  opts?: ApplyRulesOpts,
): CardTag[] {
  const textOnly = opts?.textOnly ?? false;
  const matchCardOnly = opts?.matchCardOnly ?? false;
  const tags: CardTag[] = [];
  for (const rule of rules) {
    const textResult: boolean | TagMatch =
      !matchCardOnly && rule.match ? rule.match(normalizedText) : false;
    const cardResult: boolean | TagMatch =
      !textOnly && !textResult && rule.matchCard
        ? rule.matchCard(card, normalizedText)
        : false;
    const result = textResult || cardResult;
    if (!result) continue;
    if (result === true) {
      tags.push({ tagId: rule.id, axis: rule.axis, evidence: '' });
    } else {
      tags.push({
        tagId: rule.id,
        axis: rule.axis,
        evidence: result.evidence,
        ...(result.metadata ? { metadata: result.metadata } : {}),
      });
    }
  }
  return tags;
}
