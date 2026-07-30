# @image-marker/node

Pure Node.js Recipe v2 renderer for Image Marker. It has no React or
React Native dependency. Sharp is an optional peer so applications decide the
native image runtime and version.

```sh
npm install @image-marker/node@^0.1 sharp@^0.35
```

## Render a Buffer

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { renderNodeImage } from '@image-marker/node';

const background = await readFile('photo.jpg');
const logo = await readFile('logo.png');
const result = await renderNodeImage(
  {
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        type: 'text',
        text: 'Image Marker',
        position: { position: 'topLeft', edgeInset: 32 },
        style: {
          color: '#FFFFFF',
          fontSize: 48,
          maxWidth: '60%',
          lineHeight: 56,
          letterSpacing: 1,
          maxLines: 2,
          overflow: 'ellipsis',
        },
      },
      {
        id: 'logo',
        type: 'image',
        src: logo,
        position: { position: 'bottomRight', edgeInset: 28 },
        scale: 0.4,
        alpha: 0.9,
      },
    ],
    output: { saveFormat: 'webp', quality: 86, maxSize: 2048 },
  },
  { backgroundImage: { src: background } }
);

await writeFile('marked.webp', result.data);
```

Inputs may be a Buffer, Uint8Array, file path, or readable Stream.

## File and Stream output

```ts
import {
  renderNodeImageToFile,
  renderNodeImageToStream,
} from '@image-marker/node';

await renderNodeImageToFile(recipe, input, 'dist/marked.png');
const stream = await renderNodeImageToStream(recipe, input);
stream.pipe(response);
```

## Batch, concurrency, progress, cancellation, and retry

```ts
const abortController = new AbortController();
const results = await marker.renderMany(recipe, inputs, {
  concurrency: 4,
  retries: 2,
  retryDelayMs: 100,
  signal: abortController.signal,
  onRetry: ({ index, attempt, reason }) => {
    console.warn('retry', index, attempt, reason);
  },
  onBatchProgress: ({ settled, total }) => {
    console.log(`${settled}/${total}`);
  },
});
```

Results preserve input order and settle as `fulfilled`, `rejected`, or
`aborted`. A readable Stream is single-use; use a Buffer or file path when an
item may be retried.

## Inspect

```ts
import { inspectNodeImage } from '@image-marker/node';

const info = await inspectNodeImage('photo.jpg');
// Display and encoded dimensions, format, EXIF orientation, alpha, channels…
```

## Invisible locator

The Node package can embed a short authenticated locator in lossless PNG
pixels:

```ts
import {
  detectNodeInvisibleLocator,
  embedNodeInvisibleLocator,
} from '@image-marker/node';

const embedded = await embedNodeInvisibleLocator({
  image: source,
  payload: 'asset-42',
  key: process.env.IMAGE_MARKER_TRACE_KEY!,
});

const detection = await detectNodeInvisibleLocator({
  image: embedded.data,
  key: process.env.IMAGE_MARKER_TRACE_KEY!,
});
```

`lsb-hmac-v1` is intended for lossless server pipelines. JPEG conversion,
resizing, or destructive image optimization can remove it. Keep production
keys in a secret manager and store only an opaque locator in pixels.

## Dependency injection

Sharp loads lazily. Tests or managed runtimes can inject a compatible Sharp
factory and set a process-level batch ceiling:

```ts
import sharp from 'sharp';
import { createNodeImageMarker } from '@image-marker/node';

const marker = createNodeImageMarker({
  sharp,
  maxConcurrency: 8,
});
```

The package re-exports `@image-marker/recipe`, so validation, migration,
templates, placeholders, conditions, and layer operations are available from
the same entry.
