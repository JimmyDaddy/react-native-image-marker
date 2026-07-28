<div align="center">
  <a href="https://image-marker.corerobin.com">
    <img src="assets/logo.svg" alt="React Native Image Marker" width="128" />
  </a>
  <h1>React Native Image Marker</h1>
  <p>Visible watermarks, repeating layouts, natural blend modes, personalized batches, and invisible trace IDs for iOS, Android, and Web.</p>

[![npm version](https://img.shields.io/npm/v/react-native-image-marker.svg?label=npm)](https://www.npmjs.com/package/react-native-image-marker)

</div>

## See what you can make

Compose text and image layers, keep their render order under control, and export the finished image on iOS, Android, or Web.

<p align="center">
  <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/website/public/media/watermark-after-dark.jpg" alt="A night street photograph with layered title, metadata, vertical text, and an Image Marker logo" width="100%" />
</p>

<table>
  <tr>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/website/public/media/watermark-coast.jpg" alt="A coastal photograph with a title, date, status badge, and logo watermark" width="100%" />
    </td>
    <td width="50%">
      <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/website/public/media/watermark-tiled.jpg" alt="A mountain lake covered by staggered outlined CONFIDENTIAL text with a logo in the top right" width="100%" />
    </td>
  </tr>
  <tr>
    <td><strong>Ready to share.</strong><br />Add titles, metadata, badges, and your logo in one export.</td>
    <td><strong>Protect the whole image.</strong><br />Repeat outlined text or logos with rotation, spacing, and staggered rows.</td>
  </tr>
</table>

## Install

```sh
npm install react-native-image-marker@^2
```

Install iOS pods and rebuild the native app:

```sh
npx pod-install
```

Expo projects must use a development build because this package's native code is not bundled with Expo Go. See the [Expo installation steps](https://image-marker.corerobin.com/getting-started/).

## Quick start

```ts
import Marker, { ImageFormat, Position } from 'react-native-image-marker';

const result = await Marker.markText({
  backgroundImage: {
    src: require('./images/background.jpg'),
  },
  watermarkTexts: [
    {
      text: '© Acme Studio',
      alpha: 0.85,
      position: {
        position: Position.bottomRight,
        X: 24,
        Y: 24,
      },
      style: {
        color: '#FFFFFF',
        fontSize: 28,
      },
    },
  ],
  filename: 'marked-photo',
  saveFormat: ImageFormat.jpg,
  quality: 92,
});

console.log(result.uri, result.jobId, result.durationMs);
```

Core 2 returns a structured `MarkerResult`. Use `result.uri` as the native cache-file path or browser-ready data URL. The result also includes the job ID, operation, format, MIME type, duration, and applied metadata policy.

### Repeat a readable mark across the image

The same `layout` and `strokeStyle` options work on iOS, Android, and Web. Tiled layers can use pixel or percentage gaps and stagger every second row.

```ts
const result = await Marker.markText({
  backgroundImage: { src: require('./images/background.jpg') },
  watermarkTexts: [
    {
      text: 'CONFIDENTIAL',
      alpha: 0.55,
      layout: {
        type: 'tile',
        gapX: '8%',
        gapY: '7%',
        offsetX: '-2%',
        stagger: true,
      },
      style: {
        color: '#FFFFFF88',
        fontSizeRatio: 0.024,
        rotate: -24,
        strokeStyle: { color: '#0F172A88', width: 2 },
      },
    },
  ],
  saveFormat: ImageFormat.jpg,
  quality: 92,
});
```

Use the same `layout` object on `watermarkImages` to repeat a logo. A tiled layer cannot also set `position`; invalid combinations fail with a clear error.

### Blend a watermark into the photo

Set `blendMode` on a text or image layer when a plain overlay looks too flat. The same six modes—`normal`, `multiply`, `screen`, `overlay`, `darken`, and `lighten`—work on iOS, Android, and Web.

```ts
const result = await Marker.mark({
  backgroundImage: { src: require('./images/background.jpg') },
  watermarks: [
    {
      type: 'image',
      src: require('./images/logo.png'),
      blendMode: 'multiply',
      position: { position: Position.center },
      scale: 0.7,
      alpha: 0.85,
    },
    {
      type: 'text',
      text: 'SCREEN LIGHT',
      blendMode: 'screen',
      position: { position: Position.bottomCenter, Y: 32 },
      style: { color: '#FFE9B8', fontSize: 36, bold: true },
    },
  ],
  saveFormat: ImageFormat.png,
});
```

### Personalize one recipe across a batch

Save ordered layers once, then inject safe string, number, or boolean variables for each image. Templates also expose `{{index}}` and `{{filename}}`; `visibleWhen` can include or skip a layer without rebuilding the recipe. Results stay in input order, and one failed image does not stop the others.

```ts
const recipe = Marker.createRecipe({
  schemaVersion: 2,
  layers: [
    {
      type: 'text',
      text: '© {{studio}} · {{filename}} · #{{index}}',
      position: { position: Position.bottomRight, X: 24, Y: 24 },
      style: { color: '#FFFFFF', fontSize: 28 },
    },
    {
      type: 'image',
      src: require('./images/logo.png'),
      visibleWhen: { variable: 'showLogo', equals: true },
      position: { position: Position.topRight, X: 24, Y: 24 },
      scale: 0.25,
    },
  ],
  output: {
    saveFormat: ImageFormat.jpg,
    quality: 90,
  },
});

const controller = new AbortController();
const results = await recipe.applyMany(
  photos.map((src, index) => ({
    backgroundImage: { src },
    filename: `photo-${index + 1}`,
    variables: { studio: 'Acme Studio', showLogo: index % 2 === 0 },
  })),
  {
    concurrency: 2,
    signal: controller.signal,
    onProgress: ({ settled, total }) => console.log(`${settled}/${total}`),
  }
);

const savedRecipe = JSON.stringify(recipe.toJSON());
```

### Control a render job

Single jobs accept cancellation, timeout, and progress as a second argument.
Failures use stable `ImageMarkerError.code` values and share a `jobId` with
progress and successful results.

```ts
const controller = new AbortController();
const result = await Marker.mark(options, {
  signal: controller.signal,
  timeoutMs: 15_000,
  onProgress: ({ jobId, phase, progress }) =>
    console.log(jobId, phase, progress),
});
```

On Web, request `Blob` results explicitly when processing many files without Data URL expansion:

```ts
const blobRecipe = Marker.createRecipe(recipeOptions, {
  resultType: 'blob',
});
const blob = await blobRecipe.apply({ backgroundImage: { src: file } });
```

Blob mode is Web-only and does not create object URLs. The caller controls `URL.createObjectURL()` and `URL.revokeObjectURL()` when a preview is needed.

### Embed an invisible trace ID

`embedInvisible` writes a short authenticated locator into the final pixels without adding a visible layer. `detectInvisible` recovers it later with the same key. The `*Many` methods create and verify recipient-specific copies while preserving input order. Use random asset or distribution IDs—not names, email addresses, or other personal data.

```ts
const key = await loadWatermarkKeyFromTrustedStorage();
const marked = await Marker.embedInvisible({
  image: { src: require('./images/background.jpg') },
  payload: 'asset-42', // 1–12 UTF-8 bytes
  key, // at least 16 UTF-8 bytes
  strength: 'robust',
  saveFormat: ImageFormat.png,
});

const detection = await Marker.detectInvisible({
  image: { src: { uri: marked.uri } },
  key,
  strength: 'robust',
  search: 'robust',
});

if (detection.detected) {
  console.log(detection.payload, detection.confidence);
}
```

For distribution batches, call `Marker.embedInvisibleMany(inputs, { concurrency, signal, onProgress })` and `Marker.detectInvisibleMany(inputs)`. Robust detection covers limited crops and tested 0.9×–1.1× resize hypotheses; a successful resized detection reports `scale`.

On Web, copy `lib/worker/invisible-watermark.js` to a trusted same-origin static directory and pass `worker: { scriptUrl, signal, onProgress }` to move detection off the main thread and make an active detection cancellable.

For trusted services, import `createInvisibleWatermarkRuntime` only from `react-native-image-marker/trace-runtime.js` and inject your own RGBA image codec. This explicit subpath is not loaded by the normal React Native entry. The independent [Node.js Trace Service example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/examples/trace-service) uses Node.js 22 and `sharp` without adding `sharp` to this package's production dependencies.

This Beta feature is designed for distribution tracing, not DRM or proof that an image was never edited. JPEG recompression, mild pixel adjustments, and light resizing are covered by the browser test matrix; aggressive crops, resizing outside the tested range, blur, redrawing, and deliberate removal can destroy the mark. Browser code cannot keep a long-lived secret, so production Web workflows should embed on a trusted server or use tightly scoped keys.

For signed provenance, `Marker.embedInvisibleWithCredentials()` composes the locator with an application-supplied Content Credentials adapter. The optional [Node.js C2PA service example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/examples/c2pa-service) keeps the official C2PA runtime and signing material outside the core package. See the [invisible watermark guide](https://image-marker.corerobin.com/guides/invisible-watermarks/) for the server runtime, Worker, security, and C2PA boundaries.

## Live Web SDK

Need a finished file without installing anything? Use the [free online image tools](https://image-marker.corerobin.com/tools/) for single or batch watermarks, recipient trace packages, robustness checks, and Content Credentials inspection. Images stay local.

[Try the live playground](https://image-marker.corerobin.com/playground/) when you want to compose every SDK layer, inspect its options, or embed and verify an invisible trace ID.

The Web renderer accepts URL strings, `{ uri }`, data URLs, `Blob`, `File`, and loaded browser images. In Expo Web, resolve a numeric bundled asset first:

```ts
import { Asset } from 'expo-asset';

const background = Asset.fromModule(require('./images/background.jpg'));
const webSource = { uri: background.uri };
```

Browser Canvas and native graphics stacks share the API and positioning model but are not guaranteed to be pixel-identical. Fonts, decoding, antialiasing, and JPEG encoding can differ.

## Optional interaction editor

The independently versioned
`react-native-image-marker-editor@0.0.2` package provides Recipe v2 layer
selection, drag/scale/rotate/reorder, visibility and locking, snapping,
undo/redo, accessible keyboard controls, preview rendering, and final export.
It requires Core `^2.0.0` and delegates image processing back to Core.

```sh
npm install react-native-image-marker-editor@0.0.2
```

Import `react-native-image-marker-editor/core-adapter` only when the editor
should invoke Core directly; a custom adapter can render on a server instead.
See the [Editor integration guide](https://image-marker.corerobin.com/guides/editor/),
[generated API reference](https://image-marker.corerobin.com/guides/editor/reference/),
or [open the Editor workflow](https://image-marker.corerobin.com/playground/?workflow=editor#editor-playground).

## Choose an API

| Method                                              | Use it for                                       |
| --------------------------------------------------- | ------------------------------------------------ |
| `Marker.markText`                                   | One or many text layers                          |
| `Marker.markImage`                                  | One or many logo, icon, or image layers          |
| `Marker.mark`                                       | Ordered text and image layers in one render pass |
| `Marker.createRecipe`                               | Reusable, personalized batch workflows           |
| `Marker.embedInvisible`                             | Write an authenticated short trace ID            |
| `Marker.detectInvisible`                            | Recover and verify an invisible trace ID         |
| `Marker.embedInvisibleMany` / `detectInvisibleMany` | Process ordered trace batches                    |
| `Marker.embedInvisibleWithCredentials`              | Add a signed provenance adapter workflow         |

Layers render in array order, so later layers draw over earlier layers. `markText` and `markImage` remain supported; use `mark` when mixed layer order matters.

## Compatibility

- iOS 13 or newer
- Android API 24 or newer
- Modern browsers with Canvas 2D / React Native Web
- React Native New Architecture support since library v1.3.0
- Legacy bridge fallback with the same typed public contract
- Expo development builds through native autolinking
- CI coverage for RN 0.73 legacy/new architecture, RN 0.86 New Architecture, and Expo SDK 57 / RN 0.86

See the full [compatibility guide](https://image-marker.corerobin.com/compatibility/) when maintaining an older React Native app.

## Documentation

- [简体中文文档](https://image-marker.corerobin.com/zh-cn/)
- [Installation](https://image-marker.corerobin.com/getting-started/)
- [What’s new in Core 2](https://image-marker.corerobin.com/whats-new-2/)
- [Live playground](https://image-marker.corerobin.com/playground/)
- [Free online image tools](https://image-marker.corerobin.com/tools/)
- [Guides](https://image-marker.corerobin.com/guides/choose-an-api/)
- [Visual cookbook](https://image-marker.corerobin.com/cookbook/)
- [Invisible trace watermarks](https://image-marker.corerobin.com/guides/invisible-watermarks/)
- [Optional interaction editor](https://image-marker.corerobin.com/guides/editor/)
- [Editor API reference](https://image-marker.corerobin.com/guides/editor/reference/)
- [Troubleshooting](https://image-marker.corerobin.com/troubleshooting/)
- [API reference](https://image-marker.corerobin.com/api/)

## Examples

- [React Native example](example) — full Image Marker Lab and architecture status
- [Expo example](expo-example) — native development-build workflow plus a dedicated React Native Web entry
- [C2PA service example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/examples/c2pa-service) — optional Node.js signing and verification adapter

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development and release workflow.

## License

[MIT](LICENSE)
