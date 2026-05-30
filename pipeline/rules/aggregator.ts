import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

const here = dirname(fileURLToPath(import.meta.url));

const SKIP = new Set(['index.ts', 'types.ts', 'runner.ts', 'aggregator.ts']);

function ruleFiles(): string[] {
  return readdirSync(here)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.d.ts'))
    .filter((f) => !SKIP.has(f))
    .filter((f) => /^(trigger|effect|condition)\./.test(f))
    .sort();
}

export type RuleModule = {
  rule?: Rule;
  rules?: Rule[];
  tagDef?: TagDef;
  tagDefs?: TagDef[];
};

// Exported for direct unit testing.
export function collectModule(
  file: string,
  mod: RuleModule,
  rules: Rule[],
  tagDefs: TagDef[],
): void {
  const hasRule = mod.rule != null || (mod.rules?.length ?? 0) > 0;
  const hasTagDef = mod.tagDef != null || (mod.tagDefs?.length ?? 0) > 0;
  if (!hasRule && !hasTagDef) {
    throw new Error(
      `pipeline/rules/${file}: rule file exports neither 'rule'/'rules' nor 'tagDef'/'tagDefs'. ` +
        `Every rule file must contribute at least a Rule and a TagDef.`,
    );
  }
  if (mod.rule) rules.push(mod.rule);
  if (mod.rules) rules.push(...mod.rules);
  if (mod.tagDef) tagDefs.push(mod.tagDef);
  if (mod.tagDefs) tagDefs.push(...mod.tagDefs);
}

async function loadAll(): Promise<Array<{ file: string; mod: RuleModule }>> {
  const mods: Array<{ file: string; mod: RuleModule }> = [];
  for (const f of ruleFiles()) {
    const url = pathToFileURL(join(here, f)).href;
    const mod = (await import(url)) as RuleModule;
    mods.push({ file: f, mod });
  }
  return mods;
}

let cached: { rules: Rule[]; tagDefs: TagDef[] } | null = null;
let warming: Promise<void> | null = null;

async function warm(): Promise<void> {
  if (cached) return;
  const mods = await loadAll();
  const rules: Rule[] = [];
  const tagDefs: TagDef[] = [];
  for (const { file, mod } of mods) {
    collectModule(file, mod, rules, tagDefs);
  }
  rules.sort((a, b) => a.id.localeCompare(b.id));
  tagDefs.sort((a, b) => a.tagId.localeCompare(b.tagId));
  cached = { rules, tagDefs };
}

export function aggregateRulesSync(): Rule[] {
  if (!cached) throw new Error('aggregator not warmed; call ensureWarmed() first');
  return cached.rules;
}

export function aggregateTagDefsSync(): TagDef[] {
  if (!cached) throw new Error('aggregator not warmed; call ensureWarmed() first');
  return cached.tagDefs;
}

export async function aggregateRules(): Promise<Rule[]> {
  if (!cached) await (warming ??= warm());
  return cached!.rules;
}

export async function aggregateTagDefs(): Promise<TagDef[]> {
  if (!cached) await (warming ??= warm());
  return cached!.tagDefs;
}

export async function ensureWarmed(): Promise<void> {
  if (!cached) await (warming ??= warm());
}
