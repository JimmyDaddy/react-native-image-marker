---
title: API reference
description: Generated API reference for React Native Image Marker.
---

The API reference is generated from the public TypeScript declarations on every site build.

## Methods

- [`Marker.markText`](/api/classes/marker/#marktext) renders text-only layers.
- [`Marker.markImage`](/api/classes/marker/#markimage) renders image-only layers.
- [`Marker.mark`](/api/classes/marker/#mark) renders ordered mixed layers.
- [`Marker.createRecipe`](/api/classes/marker/#createrecipe) creates reusable batch workflows.
- [`Marker.embedInvisible`](/api/classes/marker/#embedinvisible) writes an authenticated short trace ID into image pixels.
- [`Marker.detectInvisible`](/api/classes/marker/#detectinvisible) recovers and verifies an invisible trace ID.
- `Marker.embedInvisibleMany` and `Marker.detectInvisibleMany` run ordered, independently reported trace batches.
- `Marker.embedInvisibleWithCredentials` and `Marker.verifyContentCredentials` compose the pixel locator with an application-supplied signing adapter.

Core 2 visible render and invisible embed methods resolve to `MarkerResult`.
Use `result.uri` for the image and inspect `jobId`, `operation`, `format`,
`mimeType`, `durationMs`, and `metadata` for diagnostics. Single operations
accept `MarkerJobOptions` as their second argument; failures are
`ImageMarkerError` instances with a stable code.

Recipe v2 serializes stable `layers` and nested `output`. Import old persisted
documents with `migrateWatermarkRecipe()` before creating the runtime Recipe.

## Start with the main option types

- [`TextMarkOptions`](/api/interfaces/textmarkoptions/)
- [`ImageMarkOptions`](/api/interfaces/imagemarkoptions/)
- [`MarkOptions`](/api/interfaces/markoptions/)
- [`PositionOptions`](/api/interfaces/positionoptions/)
- [`EmbedInvisibleWatermarkOptions`](/api/interfaces/embedinvisiblewatermarkoptions/)
- [`DetectInvisibleWatermarkOptions`](/api/interfaces/detectinvisiblewatermarkoptions/)
- [`InvisibleWatermarkDetectionResult`](/api/interfaces/invisiblewatermarkdetectionresult/)
- [`MarkerResult`](/api/interfaces/markerresult/)
- [`MarkerJobOptions`](/api/interfaces/markerjoboptions/)

Use the generated **API reference** group in the sidebar to browse all enums, interfaces, and type aliases.
