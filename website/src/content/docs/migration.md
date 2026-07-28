---
title: Migrate from v1 to v2
description: Complete breaking-change checklist and runnable migration examples for React Native Image Marker 2.
---

import { Aside } from '@astrojs/starlight/components';

Core 2 deliberately changes the result, Recipe, error, task-control, and typed
native boundaries. Existing v1 applications remain supported on the independent
`release/1.x` line; upgrade when you are ready to adopt the new contract.

```sh
# Stay on the maintained v1 line
npm install react-native-image-marker@1

# Upgrade this application to Core 2
npm install react-native-image-marker@2
npx pod-install
```

<Aside type="caution" title="Rebuild native applications">
  Core 2 changes the generated TurboModule contract and native cancellation
  entry point. Delete stale native build artifacts, reinstall pods, and rebuild
  iOS and Android after changing the package major.
</Aside>

## Breaking-change checklist

| v1 behavior | Core 2 behavior | Required migration |
| --- | --- | --- |
| Visible and invisible embed methods resolve to a URI string | Methods resolve to `MarkerResult` | Read `result.uri`; use the additional job, format, timing, and metadata fields where useful |
| Recipe schema v1 uses `watermarks` and top-level output settings | Recipe v2 uses stable `layers` and nested `output` | Call `Marker.migrateRecipe(v1Document)` or rewrite the saved document |
| `positionOptions`, `watermarkImage`, and `watermarkPositions` are accepted | Deprecated singular/legacy aliases are removed | Use `position`, `watermarkImages`, or ordered `watermarks` |
| Native failures are unstructured strings/errors | Failures are `ImageMarkerError` with `code`, `jobId`, and `operation` | Branch on the stable code rather than parsing the message |
| A render cannot be actively controlled | Single jobs accept `signal`, `timeoutMs`, and `onProgress` | Pass an optional second argument to render/embed/detect/Recipe `apply` |
| Recipe layers have no stable editor identity | Serialized layers have stable `id` plus `name`, `visible`, `locked`, and `visibleWhen` | Preserve layer IDs when storing, patching, or editing a Recipe |
| Output metadata behavior is implicit | Pixels are orientation-normalized and source EXIF/GPS metadata is stripped | Treat `result.metadata.policy === 'strip'` as the v2 privacy baseline |
| Loosely typed native objects cross the TurboModule boundary | Complete generated TS/Android/iOS structures are used | Rebuild codegen; custom native forks must update their generated/native signatures |
| JPEG/PNG/base64 only | WebP is supported on Android and Web; iOS rejects it explicitly | Gate WebP by platform or select JPEG/PNG for portable output |

`Marker.detectInvisible()` already returns a structured detection result, so it
does not gain the `MarkerResult` wrapper. Its confidence, payload, bit-error
rate, and optional recovered scale remain directly available.

## 1. Read `result.uri`

```diff
-const path = await Marker.markText(options);
-await shareFile(path);
+const result = await Marker.markText(options);
+await shareFile(result.uri);
+console.log(result.jobId, result.durationMs, result.format);
```

The same change applies to `markImage`, `mark`, `embedInvisible`, Recipe
results, and fulfilled values from the corresponding `*Many` methods.

```diff
 const paths = batch.flatMap((item) =>
-  item.status === 'fulfilled' ? [item.value] : []
+  item.status === 'fulfilled' ? [item.value.uri] : []
 );
```

## 2. Move Recipe v1 to Recipe v2

```diff
 const definition = {
-  schemaVersion: 1,
-  watermarks: [
+  schemaVersion: 2,
+  layers: [
     {
+      id: 'copyright',
       type: 'text',
       text: '© {{studio}}',
     },
   ],
-  saveFormat: ImageFormat.jpg,
-  quality: 90,
+  output: {
+    saveFormat: ImageFormat.jpg,
+    quality: 90,
+  },
 };
```

For persisted v1 JSON, migrate once and store the returned v2 document:

```ts
import Marker, { migrateWatermarkRecipe } from 'react-native-image-marker';

const v2Document = migrateWatermarkRecipe(JSON.parse(savedRecipe));
const recipe = Marker.createRecipe(v2Document);
await saveRecipe(JSON.stringify(recipe.toJSON()));
```

`createRecipe()` intentionally accepts only v2 input. This prevents an old
document from silently retaining ambiguous output or layer semantics.

## 3. Remove deprecated aliases

```diff
 watermarkTexts: [{
   text: 'Demo',
-  positionOptions: { position: Position.center },
+  position: { position: Position.center },
 }]
```

```diff
-watermarkImage: { src: logo },
-watermarkPositions: { position: Position.topRight },
+watermarkImages: [{
+  src: logo,
+  position: { position: Position.topRight },
+}],
```

Direct `Marker.mark()` continues to use the ordered `watermarks` array. The
breaking rename to `layers` applies to Recipe v2 documents, where those objects
also carry stable editor IDs.

## 4. Adopt control and structured errors

```ts
import Marker, { ImageMarkerError } from 'react-native-image-marker';

const controller = new AbortController();

try {
  const result = await Marker.mark(options, {
    signal: controller.signal,
    timeoutMs: 15_000,
    onProgress: ({ jobId, phase, progress }) => {
      console.log(jobId, phase, progress);
    },
  });
  return result.uri;
} catch (error) {
  if (error instanceof ImageMarkerError && error.code === 'ABORTED') return;
  throw error;
}
```

Abort and timeout are idempotent. Native implementations release their active
job resources; calling `abort()` again does not turn a completed job into a
failure. Batch concurrency remains capped at 4 on Web and 1 on native to avoid
unbounded decode memory.

## 5. Font, format, and metadata policy

- Add `fontFallbacks` after `fontName` when the primary family may not contain
  every glyph.
- Prefer PNG for transparency and sharp line art, JPEG for photos, and WebP
  only after checking platform support.
- Source orientation is applied to pixels before rendering.
- Core 2 intentionally strips copied EXIF/GPS and other source metadata. Use a
  Content Credentials adapter when you need signed provenance rather than
  copying stale source claims.

## Verification before shipping

1. Search your code and saved documents for the removed aliases and
   `schemaVersion: 1`.
2. Type-check every call site that consumes a render or embed result.
3. Exercise cancellation, timeout, and one expected error on both native
   platforms.
4. Compare font fallback, rotation, transparency, JPEG matte, and orientation
   output on iOS, Android, and Web.
5. Run a clean installation of your packed application rather than relying on
   the monorepo's linked dependencies.

The original [v1 documentation](/v1/) and immutable
[v1.0.0 archive](/versions/1.0.0/) remain available throughout and after the
v1 LTS window.
