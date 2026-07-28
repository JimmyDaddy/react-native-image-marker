---
title: What’s new in Core 2
description: Core 2 release highlights, breaking changes, Editor integration, and the v1 LTS upgrade decision.
---

Core 2 turns Image Marker from a collection of render calls into a controlled,
portable image workflow. It is the current release at the documentation root;
v1 remains available on its protected maintenance line.

## Highlights

- Structured `MarkerResult` output with job IDs, duration, format, MIME type,
  and metadata policy.
- Recipe v2 with stable layer IDs, ordered mixed layers, conditions,
  visibility, locks, validation, and explicit migration.
- Progress, timeout, cancellation, stable error codes, and bounded batch
  concurrency.
- Font fallback chains, Android/Web WebP output, normalized orientation, and
  stripped source EXIF/GPS metadata.
- Invisible trace batches, Worker execution, robustness tools, and optional
  Content Credentials composition.
- The separately versioned
  [`react-native-image-marker-editor`](/guides/editor/) package for visual
  Recipe v2 authoring.

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
