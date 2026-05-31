// pipeline/emit.ts
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import type { WriteStream } from 'node:fs';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, createBrotliCompress, constants as zlib } from 'node:zlib';
import type { Artifact, Card } from '../shared/types';

export async function writeArtifact(path: string, artifact: Artifact): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  // Streams the artifact field-by-field so we never hold the entire JSON
  // document as a single string in memory. Card arrays alone are ~5 MB raw
  // today; streaming keeps headroom for Commander re-enable (Task 4) and
  // future growth without bumping into V8's max-string-length cap.
  const stream = createWriteStream(path);
  try {
    await write(stream, '{');
    await write(stream, '"cards":');
    await writeArray(stream, artifact.cards);
    await write(stream, ',"tagCatalog":');
    await write(stream, JSON.stringify(artifact.tagCatalog));
    await write(stream, `,"generatedAt":${JSON.stringify(artifact.generatedAt)}`);
    await write(stream, `,"sourceSet":${JSON.stringify(artifact.sourceSet)}`);
    await write(stream, `,"sourceSets":${JSON.stringify(artifact.sourceSets)}`);
    await write(stream, `,"ruleVersion":${JSON.stringify(artifact.ruleVersion)}`);
    if (artifact.upcomingSets) {
      await write(stream, `,"upcomingSets":${JSON.stringify(artifact.upcomingSets)}`);
    }
    if (artifact.commanderSets) {
      await write(stream, `,"commanderSets":${JSON.stringify(artifact.commanderSets)}`);
    }
    await write(stream, '}\n');
  } finally {
    stream.end();
    await once(stream, 'finish');
  }
  await writeCompressedSidecars(path);
}

// Batched per-item JSON.stringify keeps each intermediate string well under
// V8's max-string-length cap while still amortizing the per-write overhead.
const BATCH_SIZE = 5000;
async function writeArray(
  stream: WriteStream,
  items: readonly Card[],
): Promise<void> {
  await write(stream, '[');
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE, items.length);
    let buf = '';
    for (let j = i; j < end; j++) {
      buf += (j === 0 ? '' : ',') + JSON.stringify(items[j]);
    }
    await write(stream, buf);
  }
  await write(stream, ']');
}

async function write(stream: WriteStream, chunk: string): Promise<void> {
  if (!stream.write(chunk)) await once(stream, 'drain');
}

// Emits `<path>.gz` and `<path>.br` alongside the raw artifact so an object
// store (R2 / S3) can serve them with the matching Content-Encoding header.
// Brotli quality 6 trades ~5% size for ~5x speed vs. quality 11 — fine for
// the build-time path where Pareto-optimal compression isn't worth the wait.
async function writeCompressedSidecars(path: string): Promise<void> {
  await Promise.all([
    pipeline(createReadStream(path), createGzip({ level: 9 }), createWriteStream(`${path}.gz`)),
    pipeline(
      createReadStream(path),
      createBrotliCompress({
        params: {
          [zlib.BROTLI_PARAM_QUALITY]: 6,
          [zlib.BROTLI_PARAM_MODE]: zlib.BROTLI_MODE_TEXT,
        },
      }),
      createWriteStream(`${path}.br`),
    ),
  ]);
}
