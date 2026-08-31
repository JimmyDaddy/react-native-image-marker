import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageWorker = createRequire(import.meta.url).resolve(
  '@image-marker/web/worker'
);
const publicWorker = path.join(
  websiteRoot,
  'public/worker/invisible-watermark.js'
);

await mkdir(path.dirname(publicWorker), { recursive: true });
await copyFile(packageWorker, publicWorker);
console.log('Copied the packaged Web SDK Worker to public/worker/invisible-watermark.js');
