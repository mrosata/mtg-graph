// pipeline/index.ts
import { resolve } from 'node:path';
import type { Artifact, Card, TagDef } from '../shared/types';
import { STANDARD_SET_CODES, UPCOMING_SET_CODES, COMMANDER_SET_CODES } from '../shared/sets';
const UPCOMING_SET_SET = new Set(UPCOMING_SET_CODES);
const COMMANDER_SET_SET = new Set(COMMANDER_SET_CODES);
import { fetchSetFromScryfall } from './fetch';
import { DEFAULT_CACHE_DIR } from './cache';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeOracleText, stripReminderText } from './normalize';
import { extractGrantedInnerTexts, normalizeInnerGrantText } from './grant-extraction';
import { applyRules } from './rules/runner';
import { getAllRules } from './rules';
import { getTagCatalog, RULE_VERSION } from './catalog';
import { expandChildren } from './tag-expansion';
import { mergeCardsAcrossSets } from './merge';
import { writeArtifact } from './emit';
import type { CardTag } from '../shared/types';

function hasCachedSet(setCode: string): boolean {
  return existsSync(join(DEFAULT_CACHE_DIR, `${setCode}.json`));
}

type Args = { sets: string[]; out?: string; outName: string; refresh: boolean };

function parseArgs(argv: string[]): Args {
  const standardIdx = argv.indexOf('--standard');
  const upcomingIdx = argv.indexOf('--upcoming');
  const setsIdx = argv.indexOf('--sets');
  const setIdx = argv.indexOf('--set');
  const outIdx = argv.indexOf('--out');
  const out = outIdx !== -1 ? argv[outIdx + 1] : undefined;
  const refresh = argv.includes('--refresh');

  if (standardIdx !== -1) {
    // Standard ∪ Upcoming ∪ Commander, deduped (msc/hoc/trc appear in both
    // UPCOMING and COMMANDER). Re-enabled in v0.15.0 once edges moved to a
    // client-side Web Worker and the artifact wire format stopped scaling
    // with edge count.
    const sets = Array.from(
      new Set([...STANDARD_SET_CODES, ...UPCOMING_SET_CODES, ...COMMANDER_SET_CODES]),
    );
    return { sets, out, outName: 'standard', refresh };
  }
  if (upcomingIdx !== -1) {
    return { sets: UPCOMING_SET_CODES, out, outName: 'upcoming', refresh };
  }
  if (setsIdx !== -1) {
    const raw = argv[setsIdx + 1];
    if (!raw) throw new Error('--sets requires a comma-separated list');
    const sets = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (sets.length === 0) throw new Error('--sets list is empty');
    return { sets, out, outName: sets.length === 1 ? sets[0]! : 'multi', refresh };
  }
  if (setIdx !== -1) {
    const code = argv[setIdx + 1];
    if (!code) throw new Error('--set requires a code');
    const set = code.toLowerCase();
    return { sets: [set], out, outName: set, refresh };
  }
  throw new Error(
    'Missing required argument: --set <code>, --sets <a,b,c>, --standard, or --upcoming',
  );
}

// Forwarding filter for inner-grant tags. The host card grants its
// permanents the inner ability — we forward the inner's TRIGGER and
// EFFECT axes (minus intrinsic `has_*` keyword tags) so the host shows up
// as a source of those abilities in the graph. We do NOT forward:
//   - `effect.has_*` — intrinsic-keyword axes. "Creatures you control have
//     flying" doesn't make the source card fly.
//   - `condition.*` — gating/scaling axes describe what the GRANTED
//     permanent cares about, not what the source cares about.
function isForwardable(tag: CardTag, hostTagIds: Set<string>): boolean {
  if (tag.tagId.startsWith('effect.has_')) return false;
  if (tag.axis === 'condition') return false;
  // Treasure tokens grant an intrinsic mana ability; the host card "creates"
  // those tokens but does not itself add mana / ramp. The host is already
  // tagged via effect.create_treasure on the create-token clause.
  if (
    (tag.tagId === 'effect.add_mana' || tag.tagId === 'effect.ramp_nonland') &&
    hostTagIds.has('effect.create_treasure')
  ) {
    return false;
  }
  return true;
}

function tagCards(cards: Card[]): Card[] {
  const catalog = getTagCatalog();
  const rules = getAllRules();
  const tagDefById: Record<string, TagDef> = Object.fromEntries(
    catalog.map((d) => [d.tagId, d]),
  );
  return cards.map((c) => {
    const isLegendary = c.supertypes?.includes('Legendary') ?? false;

    const runOnText = (
      text: string,
      name: string,
      face: 'front' | 'back' | undefined,
      textOnly?: boolean,
    ): CardTag[] => {
      const normalized = normalizeOracleText(text, name, isLegendary);
      const hostTags = applyRules(normalized, c, rules, textOnly ? { textOnly: true } : undefined);
      const hostTagIds = new Set(hostTags.map((t) => t.tagId));
      const grantedTags: CardTag[] = [];
      for (const inner of extractGrantedInnerTexts(stripReminderText(text))) {
        const innerNorm = normalizeInnerGrantText(inner);
        for (const innerTag of applyRules(innerNorm, c, rules, textOnly ? { textOnly: true } : undefined)) {
          if (!isForwardable(innerTag, hostTagIds)) continue;
          if (hostTagIds.has(innerTag.tagId)) continue;
          hostTagIds.add(innerTag.tagId);
          grantedTags.push({ ...innerTag, evidence: `granted: ${innerTag.evidence}` });
        }
      }
      const merged = [...hostTags, ...grantedTags];
      return face ? merged.map((t) => ({ ...t, face })) : merged;
    };

    let collected: CardTag[];
    if (c.faces && c.faces.length === 2) {
      // Text-based rules run per face with face attribution; matchCard rules
      // run once at the card level (keywords are pooled by Scryfall, not per-face).
      const frontTags = runOnText(c.faces[0]!.oracleText, c.faces[0]!.name, 'front', true);
      const backTags = runOnText(c.faces[1]!.oracleText, c.faces[1]!.name, 'back', true);
      const cardLevelTags = applyRules('', c, rules, { matchCardOnly: true });

      // Dedup by tagId: text-attributed tags (with face) take priority over
      // card-level matchCard tags (no face). Seed with text tags first so they
      // win when both exist for the same tagId.
      const byTagId = new Map<string, CardTag>();
      for (const t of [...frontTags, ...backTags]) {
        if (!byTagId.has(t.tagId)) byTagId.set(t.tagId, t);
      }
      for (const t of cardLevelTags) {
        if (!byTagId.has(t.tagId)) byTagId.set(t.tagId, t);
      }
      collected = [...byTagId.values()];
    } else {
      collected = runOnText(c.oracleText, c.name, undefined);
    }

    const tags = expandChildren(collected, tagDefById);
    return { ...c, tags };
  });
}

async function main() {
  const { ensureWarmed } = await import('./rules');
  await ensureWarmed();
  const args = parseArgs(process.argv.slice(2));

  const fetched: Card[] = [];
  for (let i = 0; i < args.sets.length; i++) {
    const setCode = args.sets[i]!;
    if (i > 0) await new Promise((r) => setTimeout(r, 120));
    const cacheHit = !args.refresh && hasCachedSet(setCode);
    const action = cacheHit ? 'Loading' : args.refresh ? 'Refetching' : 'Fetching';
    const source = cacheHit ? 'cache' : 'Scryfall';
    console.log(`${action} set ${setCode} from ${source}...`);
    const rawCards = await fetchSetFromScryfall(setCode, { refresh: args.refresh });
    console.log(`  → ${rawCards.length} cards`);
    fetched.push(...rawCards);
  }

  const merged = mergeCardsAcrossSets(fetched);
  if (args.sets.length > 1) {
    console.log(`Deduplicated to ${merged.length} unique cards across ${args.sets.length} sets`);
  }

  console.log('Tagging cards with rule extractor...');
  const taggedCards = tagCards(merged);
  const taggedCount = taggedCards.filter((c) => c.tags.length > 0).length;
  console.log(`  → ${taggedCount} of ${taggedCards.length} cards have at least one tag`);

  const catalog = getTagCatalog();
  const upcomingSets = args.sets.filter((s) => UPCOMING_SET_SET.has(s));
  const commanderSets = args.sets.filter((s) => COMMANDER_SET_SET.has(s));
  const artifact: Artifact = {
    cards: taggedCards,
    tagCatalog: catalog,
    generatedAt: new Date().toISOString(),
    sourceSet: args.outName,
    sourceSets: args.sets,
    ruleVersion: RULE_VERSION,
    ...(upcomingSets.length > 0 ? { upcomingSets } : {}),
    ...(commanderSets.length > 0 ? { commanderSets } : {}),
  };

  const outPath = args.out ?? resolve(process.cwd(), `app/public/data/cards-${args.outName}.json`);
  console.log(`Writing artifact to ${outPath}`);
  await writeArtifact(outPath, artifact);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
