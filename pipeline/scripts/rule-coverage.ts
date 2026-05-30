import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureWarmed, aggregateRulesSync, aggregateTagDefsSync } from '../rules/aggregator';
import { buildRuleCoverage } from './coverage-report';
import { isTaggable } from '../coverage';
import type { Artifact } from '../../shared/types';

const ARTIFACT_PATH = resolve(process.cwd(), 'app/public/data/cards-standard.json');

async function main() {
  await ensureWarmed();
  const args = process.argv.slice(2);
  const artifact: Artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
  const cards = artifact.cards;
  const rules = aggregateRulesSync();
  const tagDefs = aggregateTagDefsSync();
  const tagDefIds = new Set(tagDefs.map((t) => t.tagId));

  if (args[0] === '--pairings') {
    let bad = 0;
    for (const t of tagDefs) {
      for (const entry of t.pairsWith) {
        const partnerId = typeof entry === 'string' ? entry : entry.tagId;
        if (!tagDefIds.has(partnerId)) {
          console.error(`MISSING: ${t.tagId} pairs with unknown ${partnerId}`);
          bad++;
        }
        if (typeof entry === 'object') {
          for (const reqId of entry.requiresOnSource ?? []) {
            if (!tagDefIds.has(reqId)) {
              console.error(`MISSING: ${t.tagId} requiresOnSource references unknown ${reqId}`);
              bad++;
            }
          }
          for (const reqId of entry.requiresOnTarget ?? []) {
            if (!tagDefIds.has(reqId)) {
              console.error(`MISSING: ${t.tagId} requiresOnTarget references unknown ${reqId}`);
              bad++;
            }
          }
        }
      }
    }
    if (bad > 0) process.exit(1);
    console.log('All pairings resolve.');
    return;
  }

  const isAll = args[0] === '--all';
  const targetIds = isAll ? rules.map((r) => r.id) : [args[0] ?? ''];
  const reports = [];
  for (const id of targetIds) {
    if (!id) {
      console.error('Usage: rule:coverage [--all|--pairings|<ruleId>]');
      process.exit(1);
    }
    const rule = rules.find((r) => r.id === id);
    if (!rule) {
      console.error(`No such rule: ${id}`);
      process.exit(1);
    }
    const r = buildRuleCoverage(cards, rule);
    reports.push(r);
    if (isAll) {
      console.log(`${r.ruleId.padEnd(40)} matches=${String(r.matches).padStart(5)}  taggable=${r.taggablePct.toFixed(1)}%`);
    } else {
      console.log(`rule: ${r.ruleId}`);
      console.log(`  matches: ${r.matches} cards (${r.naivePct.toFixed(1)}% of all, ${r.taggablePct.toFixed(1)}% of taggable)`);
      console.log('');
      console.log('  --- 10 random positives ---');
      for (const p of r.matchSample) console.log(`  ${p.name.padEnd(40)} ${p.evidence}`);
      if (rule.nearMiss) {
        console.log('');
        console.log(`  --- 20 near-miss unmatched cards (anchor=${rule.nearMiss.anchors.join(',')}, proximity=${rule.nearMiss.proximity.join(',')}, window=${rule.nearMiss.window}) ---`);
        for (const p of r.nearMissSample) console.log(`  ${p.name}`);
      }
    }
  }

  if (isAll) {
    const taggableTotal = cards.filter(isTaggable).length;
    const taggedTaggable = cards.filter((c) => isTaggable(c) && c.tags.length > 0).length;
    console.log('');
    console.log(`Aggregate taggable coverage: ${taggedTaggable}/${taggableTotal} = ${((taggedTaggable / taggableTotal) * 100).toFixed(1)}%`);
  }

  mkdirSync(resolve(process.cwd(), 'pipeline/reports'), { recursive: true });
  // Per-rule invocations write to a per-rule file to avoid clobbering the
  // `--all` snapshot that reviewers rely on.
  const outName = isAll
    ? 'rule-coverage.json'
    : `rule-coverage-${(targetIds[0] ?? 'unknown').replace(/[^a-z0-9._-]/gi, '_')}.json`;
  writeFileSync(
    resolve(process.cwd(), 'pipeline/reports', outName),
    JSON.stringify(reports, null, 2),
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
