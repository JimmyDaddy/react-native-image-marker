---
title: Compatibility
description: React Native, platform, architecture, and Expo support for React Native Image Marker.
---

Image Marker supports **iOS 13 or newer**, **Android API 24 or newer**, and modern browsers. The iOS and Android builds work with both React Native's New Architecture and the legacy bridge.

## Current support

| Environment                   | Support                   | Notes                                                                          |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| iOS                           | 13+                       | Native rendering is implemented with iOS 13 APIs.                              |
| Android                       | API 24+                   | The Android library declares API 24 as its minimum SDK.                        |
| React Native New Architecture | Yes, since library v1.3.0 | Uses the generated TurboModule binding.                                        |
| React Native legacy bridge    | Yes                       | Falls back to `NativeModules.ImageMarker`.                                     |
| Expo development build        | Yes                       | Build locally with Expo CLI or use an EAS development build.                   |
| Expo Go                       | No                        | This package's native code is not bundled with Expo Go.                        |
| Web / React Native Web        | Yes                       | Uses Canvas 2D and resolves with an image data URL.                            |
| Windows                       | Browser only              | Windows apps can use the website build, but there is no Windows-native module. |

## Web behavior

On Web, you can call `Marker.markText`, `Marker.markImage`, `Marker.mark`, `Marker.embedInvisible`, and `Marker.detectInvisible` with the same options used in React Native. The package selects its browser code automatically and does not load `NativeModules`.

Web calls resolve with a `data:image/...` URL for every output format. Sources may be a URL string, `{ uri }`, data URL, `Blob`, `File`, or an already-loaded browser image. Numeric React Native asset IDs must first be converted to a URL—for example with `Asset.fromModule(asset).uri` from `expo-asset` in an Expo Web app.

Canvas and native graphics stacks are not pixel-identical. Font availability and metrics, image decoding, antialiasing, color handling, and JPEG encoding may differ. Verify pixel-sensitive output on every platform you ship. Remote images must also permit CORS or the browser will prevent canvas export and invisible-watermark detection; robust detection reads the complete Canvas pixel buffer and is intentionally more expensive.

## Library version guide

Use this table when maintaining an older React Native application.

| React Native or platform baseline                            | Library line                                          |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| React Native 0.73+                                           | v1.2 or newer; use v1.3+ for New Architecture support |
| React Native 0.60–0.72                                       | v1.1.x                                                |
| React Native 0.60+ with iOS below 13 or Android below API 24 | v1.0.x                                                |
| React Native below 0.60                                      | v0.5.2 or earlier                                     |

Patch releases are intended to remain compatible within their minor line. For older API documentation, use the links on [Versions and migration](/migration/).

## Tested compatibility matrix

CI keeps three explicit lines instead of treating one example build as proof for every setup.

| Test line                                    | What is verified                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React Native 0.73                            | The checked-in bare example builds with the legacy bridge and New Architecture on Android; iOS verifies the legacy bridge.                                                                               |
| React Native 0.86                            | A clean New Architecture Android app installs the packed library and compiles its generated TurboModule binding.                                                                                         |
| Expo SDK 57 / React Native 0.86 / React 19.2 | The Expo example type-checks, exports native and Web bundles, generates a development-build project, and compiles on Android.                                                                            |
| Chromium, Firefox, and WebKit                | The Web example verifies JPG/PNG, `Blob`/`File`, CORS errors, rotation crop, alpha, large-image limits, tolerant pixel differences, invisible-watermark recompression, and a six-image detection corpus. |

## Verify the architecture path

The bare React Native example includes an **Architecture status** panel. It reports whether TurboModules and Fabric are available at runtime. The Expo example is configured for New Architecture and is intended to run as a development build.

- **New architecture** means the expected runtime signals are available.
- **Bridgeless off** is not a failure; bridgeless mode is separate from the New Architecture build setting.
- If the package reports that it is not linked, rebuild the native app before changing JavaScript code.
