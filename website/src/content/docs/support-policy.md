---
title: Versions and support
description: Choose between current Core v2, v1 LTS, and immutable historical documentation.
---

React Native Image Marker maintains independent documentation and release
lines so Core v2 can evolve while existing v1 applications continue receiving
critical fixes.

| Version | Status | Documentation | Install |
| --- | --- | --- | --- |
| v1 LTS (`1.12.x`) | Current maintenance line | [v1 documentation](/v1/) | `npm install react-native-image-marker@1` |
| Core v2 (`2.0.x`) | Current release | [v2 documentation](/next/) | `npm install react-native-image-marker@latest` |
| v1.0.0 | Immutable archive | [v1.0.0 archive](/versions/1.0.0/) | `npm install react-native-image-marker@1.0.0` |
| Editor `0.0.x` | Experimental | [Editor status](/editor/) | `npm install react-native-image-marker-editor@0.0.1` |

## v1 LTS commitment

v1 receives security, crash, serious correctness, platform compatibility, and
documentation fixes for at least 12 months after v2 becomes generally
available. An end-of-life date will be announced at least three months in
advance. The v1 documentation remains online after maintenance ends.

New features and breaking changes belong to v2. Fixes are developed directly
against `release/1.x` and forward-ported to v2 when applicable.

## Why v1.0.0 does not change

The `v1.0.0` tag, its locked archive branch, and its archive page preserve the
original release. Published artifacts and tags are never rewritten. Users who
need a v1 bug fix should upgrade within the compatible v1 line rather than
expecting the original `1.0.0` package to change.
