import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureWarmed } from '../rules/aggregator';
import { topNgrams } from './mine';
import { isTaggable } from '../coverage';
import { normalizeOracleText } from '../normalize';
import type { Artifact } from '../../shared/types';

const ARTIFACT_PATH = resolve(process.cwd(), 'app/public/data/cards-standard.json');
const STOP_PATH = resolve(process.cwd(), 'pipeline/reports/STOPWORDS.txt');
const MIN_FREQ_DEFAULT = 30;
const TOP_DISPLAY = 50;

async function main() {
  await ensureWarmed();
  const args = process.argv.slice(2);
  const minIdx = args.indexOf('--min');
  const minFreq = minIdx !== -1 ? Number(args[minIdx + 1]) : MIN_FREQ_DEFAULT;

  const artifact: Artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8'));
  const stop = new Set(
    readFileSync(STOP_PATH, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#')),
  );

  const untaggedTaggableTexts = artifact.cards
    .filter((c) => isTaggable(c) && c.tags.length === 0)
    .map((c) => normalizeOracleText(c.oracleText, c.name));

  const twoGrams = topNgrams(untaggedTaggableTexts, 2, stop, minFreq);
  const threeGrams = topNgrams(untaggedTaggableTexts, 3, stop, minFreq);

  console.log(`Top 2-grams in untagged taggable cards (n=${untaggedTaggableTexts.length}, min=${minFreq}):`);
  for (const { ngram, count } of twoGrams.slice(0, TOP_DISPLAY)) {
    console.log(`  ${String(count).padStart(4)}  ${ngram}`);
  }
  console.log('');
  console.log(`Top 3-grams in untagged taggable cards:`);
  for (const { ngram, count } of threeGrams.slice(0, TOP_DISPLAY)) {
    console.log(`  ${String(count).padStart(4)}  ${ngram}`);
  }

  mkdirSync(resolve(process.cwd(), 'pipeline/reports'), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), 'pipeline/reports/rule-mine.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), minFreq, twoGrams, threeGrams }, null, 2),
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
