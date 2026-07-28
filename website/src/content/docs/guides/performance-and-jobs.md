---
title: Performance and job control
description: Bound decode memory, control concurrency, observe progress, cancel work, and interpret the Core 2 reference benchmark.
---

import { Aside } from '@astrojs/starlight/components';

Image memory is determined by decoded pixels, not compressed file size. Core 2
therefore applies a bounded pipeline: inspect dimensions, fit within `maxSize`,
decode/resize, release intermediate inputs, compose once, and encode once.

## Set an explicit decode budget

`maxSize` limits the longest edge while preserving aspect ratio. The default is
2048; lower it for thumbnails and previews, and raise it only when the exported
detail is actually required.

```ts
const result = await Marker.mark(options, {
  timeoutMs: 20_000,
  signal: controller.signal,
  onProgress({ jobId, phase, progress }) {
    console.log(jobId, phase, Math.round(progress * 100));
  },
});
```

The options object above is the second argument. `phase` moves through
`queued`, `validating`, `rendering` or `detecting`, optional `encoding`, and
`completed`. Observer errors do not interrupt rendering.

## Cancellation and timeout

- Aborting before dispatch rejects with `ImageMarkerError.code === 'ABORTED'`.
- `timeoutMs` rejects with `TIMEOUT` and requests native cancellation.
- Native cancellation is idempotent and releases the matching active job.
- Every progress update, result, and structured error shares a stable `jobId`.
- A completed result is never retroactively changed by a later abort.

Use `applyMany()` or the invisible `*Many` APIs for queues. Results preserve
input order and report each item independently. Web concurrency is capped at 4;
iOS and Android are capped at 1 to prevent several large decoded bitmaps from
peaking at once.

## Preview and final export

For an interactive editor, render a lower-resolution preview first:

```ts
const preview = await adapter.renderPreview({
  recipe,
  input,
  maxSize: 1024,
});

const final = await adapter.exportOriginal({ recipe, input });
```

The optional Editor package uses this split and delegates both renders to Core,
so its UI does not duplicate native image processing.

## Reference benchmark

The Core 2 release candidate gate executes twelve repeated 1600×1200 to 400×300
downsamples on Android instrumentation and iOS simulator tests. A local iPhone
16 simulator reference run completed the twelve iOS operations in an average
of **0.059 seconds** with an average reported physical-memory peak of
**50,668 kB**.

<Aside type="note" title="Reference, not a device guarantee">
  Simulator timing and host-reported memory are regression references for this
  repository. Measure representative production devices, images, fonts,
  formats, and watermark counts before setting an application SLA.
</Aside>

The release matrix also compiles the shared C++ size-fit routine on host,
Android ABIs, and through the Objective-C++/Swift bridge. Native stress tests
repeat the operation rather than accepting a single successful render as proof
of stable resource release.

## Practical tuning order

1. Prefer native file output over base64 when native code will consume a file.
2. Set the smallest `maxSize` that preserves required detail.
3. Keep native batch concurrency at 1; use Web concurrency up to 4 only after
   measuring responsiveness.
4. Avoid serial mark calls when one ordered `Marker.mark()` pass can compose all
   layers.
5. Load fonts before rendering and provide `fontFallbacks` to avoid repeated
   missing-glyph surprises.
6. Use PNG only when transparency or sharp edges require it; use JPEG for
   photos, and WebP only on Android/Web.
7. Use a Web Worker for robust invisible detection so CPU search does not block
   the page.
