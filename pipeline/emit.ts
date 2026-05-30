// pipeline/emit.ts
import { createReadStream, createWriteStream } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, createBrotliCompress, constants as zlib } from 'node:zlib';
import type { Artifact } from '../shared/types';

export async function writeArtifact(path: string, artifact: Artifact): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  // v0.14.9 — dropped JSON.stringify pretty-printing (`null, 2`). Artifact
  // hit ~528 MB pretty-printed and started failing the V8 max-string-length
  // limit (~536 MB) as edge count grew past 1.7M. Compact JSON is ~30%
  // smaller; the app parses it the same way.
  await writeFile(path, JSON.stringify(artifact) + '\n', 'utf8');
  await writeCompressedSidecars(path);
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
