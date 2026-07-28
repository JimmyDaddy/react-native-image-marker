---
title: Compatibility
description: React Native, platform, architecture, and Expo support for React Native Image Marker.
---

Core 2 supports **React Native 0.73+**, **React 18+**, **Node 20.19+** for
tooling, **iOS 13+**, **Android API 24+**, and modern browsers. iOS and Android
use the same typed public contract with React Native's New Architecture and the
legacy bridge.

## Current support

| Environment                   | Support                   | Notes                                                                          |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| iOS                           | 13+                       | Native rendering is implemented with iOS 13 APIs.                              |
| Android                       | API 24+                   | The Android library declares API 24 as its minimum SDK.                        |
| React Native                  | 0.73+                     | Core 2 peer baseline; tested legacy and current lines are listed below.        |
| React                         | 18+                       | React 19 is covered by the Expo line.                                          |
| React Native New Architecture | Yes                       | Uses the complete generated TurboModule binding.                               |
| React Native legacy bridge    | Yes                       | Uses the same typed options, results, errors, and cancellation semantics.      |
| Expo development build        | Yes                       | Build locally with Expo CLI or use an EAS development build.                   |
| Expo Go                       | No                        | This package's native code is not bundled with Expo Go.                        |
| Web / React Native Web        | Yes                       | Uses Canvas 2D; `MarkerResult.uri` is an image data URL.                       |
| Windows                       | Browser only              | Windows apps can use the website build, but there is no Windows-native module. |

## Web behavior

On Web, visible marking, recipes, invisible trace batches, robust detection, and Content Credentials adapters use the same public API as React Native. The package selects its browser code automatically and does not load `NativeModules`.

Web calls resolve with a structured `MarkerResult`; `result.uri` is a
`data:image/...` URL for every output format. Sources may be a URL string,
`{ uri }`, data URL, `Blob`, `File`, or an already-loaded browser image.
Numeric React Native asset IDs must first be converted to a URL—for example
with `Asset.fromModule(asset).uri` from `expo-asset` in an Expo Web app.

Canvas and native graphics stacks are not pixel-identical. Font availability and metrics, image decoding, antialiasing, color handling, and JPEG encoding may differ. Verify pixel-sensitive output on every platform you ship. Remote images must also permit CORS or the browser will prevent canvas export and invisible-watermark detection; robust detection reads the complete Canvas pixel buffer and is intentionally more expensive.

## Library version guide

Use this table when maintaining an older React Native application.

| Application baseline                                        | Recommended library line                              |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| React Native 0.73+ and ready for breaking API changes        | Core 2                                                |
| Existing React Native 0.73+ application staying on v1        | Latest v1 LTS (`npm install react-native-image-marker@1`) |
| React Native 0.60–0.72                                       | v1.1.x                                                |
| React Native 0.60+ with iOS below 13 or Android below API 24 | v1.0.x                                                |
| React Native below 0.60                                      | v0.5.2 or earlier                                     |

Core 2 is a major upgrade because its return type, Recipe schema, errors,
control surface, and generated native boundary change. For the complete
checklist, use [Migrate from v1 to v2](/migration/).

## Tested compatibility matrix

CI keeps three explicit lines instead of treating one example build as proof for every setup.

| Test line                                    | What is verified                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Native 0.73                            | The checked-in bare example type-checks and builds with the legacy bridge and New Architecture on Android; iOS verifies the bridge, shared C++ bridge, and selected simulator tests.                       |
| React Native 0.86                            | A clean New Architecture Android app installs the packed library and compiles its generated TurboModule binding.                                                                                         |
| Expo SDK 57 / React Native 0.86 / React 19.2 | The Expo example type-checks, exports native and Web bundles, generates a development-build project, and compiles on Android.                                                                            |
| Chromium, Firefox, and WebKit                | The Web example verifies JPG/PNG, `Blob`/`File`, CORS errors, rotation crop, alpha, large-image limits, tolerant pixel differences, invisible-watermark recompression, responsive batch detection, and 0.9×–1.1× recovery across a six-image corpus. |

## Output differences

| Capability | iOS | Android | Web |
| --- | --- | --- | --- |
| JPEG / PNG | Yes | Yes | Yes |
| WebP | Explicitly rejected | Yes | Yes |
| Base64/data URL | Yes | Yes | All output is a data URL |
| Orientation | Normalized | Normalized | Normalized during browser decode |
| Copied EXIF/GPS metadata | Stripped | Stripped | Stripped |
| Maximum batch concurrency | 1 | 1 | 4 |

## Verify the architecture path

The bare React Native example includes an **Architecture status** panel. It reports whether TurboModules and Fabric are available at runtime. The Expo example is configured for New Architecture and is intended to run as a development build.

- **New architecture** means the expected runtime signals are available.
- **Bridgeless off** is not a failure; bridgeless mode is separate from the New Architecture build setting.
- If the package reports that it is not linked, rebuild the native app before changing JavaScript code.
