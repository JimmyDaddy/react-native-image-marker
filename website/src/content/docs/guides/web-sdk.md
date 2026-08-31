---
title: Standalone Web SDK
description: Use Image Marker in a browser, Vite app, or WebView without React Native.
---

`@image-marker/web@0.1.0` is the browser package for applications that do not
install React Native or run a Node sidecar. It uses the existing Canvas 2D
renderer and keeps the public Core, Recipe, invisible watermark, and editor
headless contracts in one package.

```sh
npm install @image-marker/web@0.1.0
```

## Render a local file

The Web SDK accepts `File`, `Blob`, data URL, URL string, or a loaded browser
image. Local files are a good default for a desktop WebView because the host can
keep file authorization and storage policy outside the SDK.

```ts
import Marker, { ImageFormat, Position } from '@image-marker/web';

const file = input.files?.[0];
if (!file) throw new Error('Choose an image.');

const result = await Marker.markText({
  backgroundImage: { src: file },
  watermarkTexts: [
    {
      text: 'IMAGE MARKER',
      position: { position: Position.bottomRight, X: 24, Y: 24 },
      style: { color: '#FFFFFF', fontSize: 28, bold: true },
    },
  ],
  saveFormat: ImageFormat.png,
});

preview.src = result.uri;
```

Web output is a data URL. For an in-memory `Blob`, create a Recipe with
`{ resultType: 'blob' }`, then release its object URL when the preview changes:

```ts
const recipe = Marker.createRecipe(
  {
    schemaVersion: 2,
    layers: [
      {
        id: 'caption',
        type: 'text',
        text: '© {{filename}}',
        style: { color: '#FFFFFF', fontSize: 24 },
        position: { position: Position.bottomLeft, X: 20, Y: 20 },
      },
    ],
    output: { saveFormat: ImageFormat.jpg, quality: 92 },
  },
  { resultType: 'blob' }
);
const blob = await recipe.apply({
  backgroundImage: { src: file },
  filename: file.name,
});
const url = URL.createObjectURL(blob);
preview.src = url;
// Call URL.revokeObjectURL(url) when this preview is replaced.
```

`applyMany()` preserves input order and reports each item independently. Pass
an `AbortSignal` to stop queued work and cooperative stages. When cancellation
must cover an instance boundary, create the Recipe from `marker`:

```ts
import { createWebMarker } from '@image-marker/web';

const marker = createWebMarker();
const recipe = marker.createRecipe(recipeDocument, { resultType: 'blob' });
const controller = new AbortController();
const pending = recipe.apply(
  { backgroundImage: { src: file } },
  { signal: controller.signal }
);
const completion = pending.catch(() => undefined);
controller.abort();
await marker.cancel(); // waits for completion and any host acknowledgement
await completion;
await marker.dispose();
```

Canvas work that is already synchronous may finish before the signal is
observed. A Promise timeout or ignoring the result does not stop that work. If
the host requires immediate CPU termination, it must terminate the Worker or
task that it owns and discard late results.

For a Tauri or another isolated host, create an instance with
`createWebMarker({ resources, execution })`. The resource adapter owns
`createImage`, `createCanvas`, object-URL cleanup, and byte reads. The execution
adapter's `start({ taskId, operation, resultKind, options, signal })` returns
the real task promise plus optional `terminate`/`cancel` and `dispose` hooks.
`marker.cancel()` and `marker.dispose()` wait for host acknowledgement, while
`marker.capabilities` reports which operations require host termination.

## Public entries

The package is split so an application can choose the smallest public surface:

| Entry | Use |
| --- | --- |
| `@image-marker/web` | `Marker`, enums, Recipe helpers, visible and invisible watermark APIs |
| `@image-marker/web/headless` | `ImageMarkerEditorController`, layer operations, geometry, projection, presets, and types |
| `@image-marker/web/editor-adapter` | `createWebEditorAdapter(previewMaxSize?)` and `resolveWebEditorSourceInfo` |
| `@image-marker/web/worker` | Packaged invisible watermark detection Worker |

The headless editor owns Recipe state, selection, and undo/redo. The Web adapter
connects it to Canvas preview and original export without importing the React
Native editor UI:

```ts
import { ImageMarkerEditorController } from '@image-marker/web/headless';
import { createWebEditorAdapter } from '@image-marker/web/editor-adapter';

const controller = new ImageMarkerEditorController({
  document: {
    schemaVersion: 2,
    layers: [{ id: 'title', type: 'text', text: 'Draft' }],
    output: { saveFormat: 'png' },
  },
});
const adapter = createWebEditorAdapter(1024);
const request = {
  recipe: controller.exportRecipe(),
  input: { backgroundImage: { src: file } },
};
const preview = await adapter.renderPreview(request);
const exported = await adapter.exportOriginal(request);
```

The instance API is an opt-in boundary. The default static `Marker` keeps the
existing DOM Canvas behavior, while an injected execution adapter can dispatch
whole operations to a host-owned Tauri task. The host must settle the returned
task only after it has completed or stopped and must discard late results.

## Invisible watermarks and Worker resources

Use a short locator (1–12 UTF-8 bytes) and keep the secret outside browser
source code. The Worker is for invisible watermark detection only; the entire
Canvas image engine cannot be moved into a generic Worker.

Vite resolves the packaged resource without a CDN URL:

```ts
import workerUrl from '@image-marker/web/worker?url';

const detection = await Marker.detectInvisible({
  image: { src: file },
  key: await loadKeyFromTrustedStorage(),
  search: 'robust',
  worker: { scriptUrl: workerUrl },
});
```

The old site URL `/worker/invisible-watermark.js` remains available. The site
build copies that file from the built Web package's public export. A consumer
may use the same packaged export or a bundler URL import; it should not import a
repository source path.

## URLs, CORS, and C2PA

Remote URLs remain supported when the image server allows CORS and the host CSP
allows the relevant image and worker sources. The SDK does not globally disable
remote URLs. In a restricted browser, metadata reads use the supplied file
bytes or decoded image rather than requiring a `fetch(dataURL)` workaround.

C2PA is an optional integration boundary. Install and load a C2PA library only
when the application needs to inspect or sign manifests; it is not a dependency
of the Web SDK. Signing and key custody remain application or service policy.

This browser package has not been claimed as a Tauri 2 macOS, Windows, or Linux
acceptance test. The downstream Tauri application must verify its own WebView
Canvas behavior, file authorization, Worker lifecycle, and host termination
policy. See the [minimal Vite consumer](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/examples/web-sdk)
and the [Web SDK package README](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/packages/web).
