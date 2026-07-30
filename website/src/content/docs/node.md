---
title: Node renderer
description: Render Recipe v2 images in a Node.js service without React Native.
---

`@image-marker/node@0.1` is a pure Node.js renderer powered by Sharp. It has no
React or React Native dependency, accepts file paths, buffers, typed arrays,
and readable streams, and can return a buffer, write a file, or produce a
stream.

```sh
npm install @image-marker/node@^0.1 sharp@^0.35
```

## Render on a server

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { renderNodeImage } from '@image-marker/node';

const background = await readFile('photo.jpg');
const result = await renderNodeImage(
  {
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        type: 'text',
        text: 'Prepared for {{recipient}}',
        position: { position: 'topLeft', edgeInset: 32 },
        style: { color: '#FFFFFF', fontSize: 48, maxWidth: '60%' },
      },
    ],
    output: { saveFormat: 'webp', quality: 86, maxSize: 2048 },
  },
  {
    backgroundImage: { src: background },
    variables: { recipient: 'Alice' },
  }
);

await writeFile('marked.webp', result.data);
```

Use `renderNodeImageToFile()` for an atomic file-oriented workflow and
`renderNodeImageToStream()` for HTTP responses. `createNodeImageMarker()`
creates an injectable renderer with a process-level concurrency ceiling.

## Batch and inspection

`marker.renderMany()` preserves input order and supports bounded concurrency,
retry, progress, and `AbortSignal` cancellation. `inspectNodeImage()` returns
encoded and display dimensions, format, EXIF orientation, alpha, channels, and
density.

The package also provides authenticated lossless PNG locator helpers:
`embedNodeInvisibleLocator()` and `detectNodeInvisibleLocator()`. Store keys in
a secret manager. JPEG conversion, resizing, or destructive optimization can
remove this locator.

For shell scripts and CI pipelines, use the [Image Marker CLI](/cli/). For
mobile and browser rendering, use [Core](/getting-started/).

