---
title: Troubleshooting
description: Fix linking, Expo, font, output, quality, positioning, and memory issues.
---

## “The package doesn't seem to be linked”

The JavaScript layer could not find either the generated TurboModule or the legacy native module.

1. On iOS, run `npx pod-install`.
2. Rebuild the native app after installing the package.
3. If you use Expo, confirm that you are running a development build rather than Expo Go.
4. Stop Metro, remove the app from the simulator or device if needed, and build again.

## It works in a bare app but not Expo Go

This is expected. React Native Image Marker includes native iOS and Android code that is not bundled with Expo Go. Build and install a development build locally with `npx expo run:android` or `npx expo run:ios`, or create a development build with EAS Build. Rebuild the native app after installing or upgrading the package; restarting Metro alone cannot add the native module.

## A custom font is ignored

`fontName` must be a platform font family, not necessarily the filename.

- Verify the font in a regular React Native `<Text>` component first.
- On iOS, use the registered PostScript name and include the font in the app bundle.
- On Android, make sure the font is linked into the Android assets.
- On Web, load the font before calling Marker and confirm it is available to Canvas.

Add `fontFallbacks: ['Noto Sans', 'Arial']` after the preferred `fontName` when
the primary family may not contain every glyph. If none resolve, the platform
default remains the final fallback.

## Web cannot load or export a remote image

Canvas export follows browser CORS rules. The image server must return an appropriate `Access-Control-Allow-Origin` header; otherwise use a same-origin URL, local `File` / `Blob`, or data URL. The SDK reports this as a load or tainted-canvas error.

If Expo Web passes a numeric `require()` asset ID, convert it first with `Asset.fromModule(asset).uri` from `expo-asset`, then pass the URL or `{ uri }` to Marker. React Native Web does not expose `Image.resolveAssetSource()`.

## A QR code or logo looks blurry

- Save as `ImageFormat.png`.
- Set the final watermark size with `scale` rather than pre-compressing the source.
- Avoid JPEG for sharp line art.
- Use `trimTransparentPadding: true` when invisible outer pixels make the visible mark unexpectedly small.

## A rotated result is clipped or becomes larger

`RotationCanvasMode.expand` preserves the full rotated image and can enlarge the canvas. Use `RotationCanvasMode.crop` when output dimensions must stay fixed and clipping is acceptable.

## A layer is not flush with the edge

Named positions use a compatibility inset when an axis is omitted. Set `edgeInset: 0`, or provide explicit `X` and `Y` offsets.

## The result is not in the photo library

On native targets, JPEG, PNG, and supported WebP results are cache files. The
marker does not request media-library permission or save to the camera roll.
Use a media-library package such as [React Native CameraRoll](https://github.com/react-native-cameraroll/react-native-cameraroll)
with `result.uri`. On Web, use `result.uri` as a download link.

## Large images use too much memory

Image composition and data URL encoding both require memory proportional to the
decoded bitmap. Set an explicit `maxSize`, prefer native file output, and keep
native batch concurrency at 1. Every Web output is a data URL, so source-size
discipline is especially important there. See [Performance and job control](/guides/performance-and-jobs/).

## Handle a structured Core 2 failure

Catch `ImageMarkerError` and log `code`, `jobId`, and `operation`. Report the
message too, but do not parse it to make application decisions.

```ts
try {
  await Marker.mark(options, { timeoutMs: 15_000 });
} catch (error) {
  if (error instanceof ImageMarkerError) {
    console.error(error.code, error.jobId, error.operation, error.message);
  }
}
```

## Still blocked?

Search the [open issues](https://github.com/JimmyDaddy/react-native-image-marker/issues) or open a report with:

- React Native and library versions
- iOS, Android, or browser version
- New Architecture and Expo status
- Input source type and output format
- A minimal options object and the complete error message
