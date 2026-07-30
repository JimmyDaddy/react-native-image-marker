# Changelog

## 0.3.0 (2026-07-30)

- Rebuilt the preview API around multi-selection, grouping, alignment,
  distribution, portable copy/paste, rich text and image property editing.
- Added production Toolbar, Inspector, Layer Panel, and Asset Panel components
  with accessible controls, stable test IDs, and custom render slots.
- Added resize handles, a rotation handle, canvas zoom/pan/fit, safe-area
  overlays, snap guides, expanded shortcuts, and group-aware transforms.
- Added templates, placeholders, conditional layers, brand color/font/Logo
  presets, plugin slots, controlled state, and autosave/restore adapters.
- Added automatic source dimension and orientation lookup through Core 2.1;
  callers no longer need to maintain `sourceSize`.
- Added component, controller, persistence, preset, Core adapter, consumer, and
  native E2E coverage.
- Raised the Core peer dependency to `^2.1.0` and added the shared
  `@image-marker/recipe@^0.1.0` runtime dependency.

## 0.1.0 (2026-07-29)

- Stabilized the public Editor and `core-adapter` export contract while keeping
  `react-native-image-marker@^2.0.0` as the rendering peer.
- Added optional `testID` props with stable canvas, layer, toolbar, and action
  identifiers for application tests and native automation.
- Kept individual layers exposed to assistive technology instead of grouping
  them behind one parent canvas accessibility element.
- Added React component coverage plus iOS and Android end-to-end workflows for
  layer creation, undo, Core preview, and original-resolution export.
- Added a checked API contract, packed-consumer type coverage, and migration
  notes for applications upgrading from `0.0.x`.
- Kept the Recipe v2, controller, projection, and adapter APIs backward
  compatible with `0.0.3`; no application code change is required.

## 0.0.3 (2026-07-29)

- Added an explicit `sourceSize` coordinate space so the interactive surface,
  bounded Core preview, and original export preserve the same normalized layer
  geometry.
- Added reusable viewport and Recipe projection helpers, including scaling for
  text metrics, image layers, shadows, strokes, backgrounds, tiles, and
  numeric positioning values.
- Fixed the default Editor surface and Web/React Native examples so font and
  image scale are applied exactly once and source images are not cropped.
- Added projection and Core-adapter regression coverage for preview parity.

## 0.0.2 (2026-07-28)

- Added canonical package metadata and direct links to the integration guide,
  generated API reference, and Editor workflow in the browser Playground.
- Aligned the npm README and site version labels with the current root-hosted
  Core 2 documentation.
- Added site-level mobile discovery, categorized Tools placement, and
  deep-link regression coverage without changing the Editor runtime API.

## 0.0.1 (2026-07-28)

- Added the headless Recipe v2 controller with stable layer IDs, selection,
  grouped undo/redo, visibility, locks, safe areas, snapping, and keyboard
  commands.
- Added React Native/Web editor and toolbar surfaces for text and image layer
  selection, drag, pinch scale, rotation, reorder, and accessibility actions.
- Added Recipe v1 import migration and v2 export.
- Added the opt-in Core adapter for bounded previews, original export,
  invisible locator embedding, and optional Content Credentials.
- Declared `react-native-image-marker@^2.0.0` as a peer dependency and verified
  CommonJS, ESM, TypeScript, and packed consumer installation.
