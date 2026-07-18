---
title: Versions and migration
description: Upgrade to current APIs and find documentation for older React Native Image Marker versions.
---

The main documentation describes the current v1.x release line. Older snapshots are kept as migration references rather than separate copies of the whole site.

## Current API choices

- Keep `Marker.markText` for text-only work.
- Keep `Marker.markImage` for image-only work.
- Use `Marker.mark` for ordered text and image layers in one render pass.
- Use `position` on each layer. `positionOptions` remains only for compatibility.
- Use the plural `watermarkImages` array instead of `watermarkImage` and `watermarkPositions`.

## Moving from older v1 code

```diff
 watermarkTexts: [
   {
     text: 'Demo',
-    positionOptions: { position: Position.center },
+    position: { position: Position.center },
   },
 ]
```

```diff
-watermarkImage: { src: logo },
-watermarkPositions: { position: Position.topRight },
+watermarkImages: [
+  {
+    src: logo,
+    position: { position: Position.topRight },
+  },
+],
```

## Adding a Web target

The Marker method names and options do not change. For Web, convert numeric React Native assets to browser URLs, expect a data URL instead of a temporary file path, and configure CORS for remote images. See [Compatibility](/compatibility/#web-behavior) for browser-specific differences.

## Historical references

- [v1.1.x wiki](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.1.x)
- [v1.0.x wiki](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.0.x)
- [v0.9.2 wiki](https://github.com/JimmyDaddy/react-native-image-marker/wiki/0.9.2)
- [Changelog](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/CHANGELOG.md)

If an older app depends on platform versions below iOS 13 or Android API 24, use the older line listed in [Compatibility](/compatibility/) instead of forcing the current native implementation into that baseline.
