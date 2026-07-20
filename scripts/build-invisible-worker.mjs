import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const output = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(repositoryRoot, 'lib/worker/invisible-watermark.js');

await mkdir(path.dirname(output), { recursive: true });
await build({
  entryPoints: [path.join(repositoryRoot, 'src/web/invisible-worker.ts')],
  outfile: output,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
});

console.log(
  `Built invisible watermark Worker: ${path.relative(repositoryRoot, output)}`
);
