# `@image-marker/web`

Standalone browser SDK for Image Marker. It runs with Canvas 2D and Web APIs and
does not install React Native, a Node sidecar, or native modules.

```sh
npm install @image-marker/web@0.1.0
```

## Quick start

```ts
import Marker, { ImageFormat, Position } from '@image-marker/web';

const result = await Marker.markText({
  backgroundImage: { src: file }, // File, Blob, data URL, URL, or loaded image
  watermarkTexts: [
    {
      text: '© Acme',
      position: { position: Position.bottomRight, X: 24, Y: 24 },
      style: { color: '#FFFFFF', fontSize: 28 },
    },
  ],
  saveFormat: ImageFormat.png,
});

preview.src = result.uri;
```

The root entry exports the Web `Marker`, the existing public enums and types,
Recipe v2 helpers, visible watermark methods, and invisible watermark
embed/detect methods. Web results expose a data URL in `result.uri`.

## Public subpaths

- `@image-marker/web/headless` exports `ImageMarkerEditorController`, geometry,
  projection, presets, and editor types without React or React Native UI.
- `@image-marker/web/editor-adapter` exports `createWebEditorAdapter` and
  `resolveWebEditorSourceInfo`. The adapter connects a headless Recipe to Canvas
  preview and original export.
- `@image-marker/web/worker` and
  `@image-marker/web/worker/invisible-watermark.js` resolve to the packaged
  invisible-watermark Worker. Vite can resolve it with
  `import workerUrl from '@image-marker/web/worker?url'`.

```ts
import { ImageMarkerEditorController } from '@image-marker/web/headless';
import { createWebEditorAdapter } from '@image-marker/web/editor-adapter';

const controller = new ImageMarkerEditorController({
  document: { schemaVersion: 2, layers, output: { saveFormat: 'png' } },
});
const adapter = createWebEditorAdapter(1024);
const preview = await adapter.renderPreview({
  recipe: controller.exportRecipe(),
  input: { backgroundImage: { src: file } },
});
```

## Cancellation and ownership

Pass an `AbortSignal` to Recipe jobs or Worker detection. Abort stops queued and
cooperative work; synchronous Canvas work already in progress may only be
discarded when it returns. A host that needs immediate CPU termination must stop
the Worker or task it owns. Promise timeouts and ignoring late values do not stop
work. Revoke object URLs and dispose controllers/listeners when their UI or task
ends.

For a Tauri or other isolated host, use `createWebMarker(options?)` to inject
`resources` (`createImage`, `createCanvas`, object-URL cleanup, and byte reads)
and an `execution` adapter. `execution.start()` returns the real task promise
plus optional `terminate`/`cancel` and `dispose` hooks. `marker.cancel()` and
`marker.dispose()` wait for the host acknowledgement; a timeout or ignored
late value is not termination. Inspect `marker.capabilities` to distinguish
cooperative Worker detection from default DOM work that requires host
termination.

Create Recipes from that instance when its cancellation boundary should include
the Recipe task:

```ts
import { createWebMarker } from '@image-marker/web';

const marker = createWebMarker();
const recipe = marker.createRecipe(recipeDocument, { resultType: 'blob' });
const pending = recipe.apply(input, { signal: abortController.signal });
const completion = pending.catch(() => undefined);
abortController.abort();
await marker.cancel();
await completion;
await marker.dispose();
```

The packaged Worker handles invisible watermark detection only. It is not a
general Canvas image engine. Remote URLs remain supported when the remote server
allows CORS; local `File` and `Blob` inputs are recommended for desktop apps.
C2PA is an optional integration boundary and is not installed by this package.

See the [Web SDK guide](../../docs/web-sdk.md) and the runnable
[Vite example](../../examples/web-sdk/).
