---
title: What’s new in Core 2
description: Core 2 release highlights, breaking changes, Editor integration, and the v1 LTS upgrade decision.
---

Core 2 turns Image Marker from a collection of render calls into a controlled,
portable image workflow. It is the current release at the documentation root;
v1 remains available on its protected maintenance line.

## Core 2.1 and the shared toolchain

Core 2.1 adds cross-platform `Marker.getImageInfo()`, consistent rich-text
layout controls, and direct Recipe package integration. The same Recipe v2
document now moves through five deliberately separate packages:

| Package | Owns |
| --- | --- |
| [`@image-marker/recipe`](/recipe/) | Schema, validation, migration, templates, and layer operations |
| `react-native-image-marker` | iOS, Android, and browser rendering |
| [`react-native-image-marker-editor`](/guides/editor/) | Optional React Native and Web interaction UI |
| [`@image-marker/node`](/node/) | Pure Node.js server rendering with Sharp |
| [`@image-marker/cli`](/cli/) | Terminal and CI automation |

## Highlights

- Structured `MarkerResult` output with job IDs, duration, format, MIME type,
  and metadata policy.
- Recipe v2 with stable layer IDs, ordered mixed layers, conditions,
  visibility, locks, validation, and explicit migration.
- Progress, timeout, cancellation, stable error codes, and bounded batch
  concurrency.
- Font fallback chains, Android/Web WebP output, normalized orientation, and
  stripped source EXIF/GPS metadata.
- Cross-platform image inspection and rich-text width, line-height,
  letter-spacing, line-limit, overflow, and alignment controls in Core 2.1.
- Invisible trace batches, Worker execution, robustness tools, and optional
  Content Credentials composition.
- Editor 0.3 with formal panels, multi-selection, grouping, alignment,
  handles, viewport control, autosave, templates, brand kits, and plugins.

## Breaking changes at a glance

| v1 | Core 2 |
| --- | --- |
| Render methods return a URI string | Read `result.uri` from `MarkerResult` |
| Recipe v1 uses `watermarks` and top-level output fields | Recipe v2 uses stable `layers` and nested `output` |
| Legacy aliases are accepted | Use `position`, `watermarkImages`, and current ordered layer fields |
| Errors are unstructured | Handle `ImageMarkerError.code` |
| No active job control | Pass `signal`, `timeoutMs`, and `onProgress` |

Read the complete [migration checklist](/migration/) before changing the major
version, then run a clean native rebuild.

## Should I upgrade now?

Choose Core 2 for new applications, Recipe authoring, controlled jobs, Web
rendering, trace workflows, or Editor integration. Stay on
[`react-native-image-marker@1`](/v1/) while an existing application needs the
old return and Recipe contracts; v1 continues to receive critical fixes under
the published [support policy](/support-policy/).

## Try it

- [Install Core 2](/getting-started/)
- [Open the Playground](/playground/)
- [Open the Editor workflow](/playground/?workflow=editor#editor-playground)
- [Browse the Core API](/api/)
- [Browse the Editor API](/guides/editor/reference/)
