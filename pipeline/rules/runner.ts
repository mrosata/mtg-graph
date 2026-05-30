// pipeline/rules/runner.ts
import type { Card, CardTag } from '../../shared/types';
import type { Rule, TagMatch } from './types';

export function applyRules(normalizedText: string, card: Card, rules: Rule[]): CardTag[] {
  const tags: CardTag[] = [];
  for (const rule of rules) {
    const textResult: boolean | TagMatch = rule.match ? rule.match(normalizedText) : false;
    const cardResult: boolean | TagMatch =
      !textResult && rule.matchCard ? rule.matchCard(card, normalizedText) : false;
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
