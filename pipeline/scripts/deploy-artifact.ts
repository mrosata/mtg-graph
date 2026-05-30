// pipeline/scripts/deploy-artifact.ts
// Uploads the pre-compressed brotli artifact to a Cloudflare R2 bucket with
// the headers a browser needs to fetch it as transparent application/json.
//
// Usage:
//   R2_BUCKET=mtg-graph-artifacts npm run deploy:artifact            # standard
//   R2_BUCKET=mtg-graph-artifacts npm run deploy:artifact -- tdm     # specific set
//
// Requires `wrangler` to be available via npx (no install needed) and the
// user to have run `wrangler login` once.
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const bucket = process.env.R2_BUCKET;
if (!bucket) {
  console.error('R2_BUCKET env var is required (e.g. R2_BUCKET=mtg-graph-artifacts).');
  process.exit(1);
}

const setCode = process.argv[2] ?? 'standard';
const key = `cards-${setCode}.json`;
const file = resolve(process.cwd(), `app/public/data/${key}.br`);

if (!existsSync(file)) {
  console.error(`Missing compressed artifact: ${file}`);
  const cmd =
    setCode === 'standard'
      ? 'npm run build:cards -- --standard'
      : `npm run build:cards -- --set ${setCode}`;
  console.error(`Run \`${cmd}\` first so the .br sidecar is emitted.`);
  process.exit(1);
}

const sizeMb = (statSync(file).size / 1024 / 1024).toFixed(1);
console.log(`Uploading ${file} (${sizeMb} MB) → r2://${bucket}/${key}`);

const proc = spawn(
  'npx',
  [
    'wrangler',
    'r2',
    'object',
    'put',
    `${bucket}/${key}`,
    `--file=${file}`,
    '--content-type=application/json',
    '--content-encoding=br',
    '--cache-control=public,max-age=300',
    // Without --remote, wrangler writes to the Miniflare local emulator
    // (.wrangler/state/v3/r2/...), not the actual R2 bucket.
    '--remote',
  ],
  { stdio: 'inherit' },
);
proc.on('exit', (code) => process.exit(code ?? 1));
