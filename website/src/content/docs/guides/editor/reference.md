---
title: Editor API reference
description: Public controller, component, adapter, state, geometry, and export APIs for react-native-image-marker-editor.
---

This reference is generated from the public TypeScript declarations in
`react-native-image-marker-editor`. The Editor owns interaction and Recipe v2
state; Core or an injected adapter owns image rendering.

## Main entry points

- [`ImageMarkerEditorController`](/guides/editor/reference/classes/imagemarkereditorcontroller/)
  — Recipe state, selection, layer mutation, undo/redo, keyboard commands, and
  persistence.
- [`ImageMarkerEditor`](/guides/editor/reference/functions/imagemarkereditor/)
  — React Native/Web editing surface.
- [`ImageMarkerEditorToolbar`](/guides/editor/reference/functions/imagemarkereditortoolbar/)
  — composable layer controls.
- [`createCoreEditorAdapter`](/guides/editor/reference/functions/createcoreeditoradapter/)
  — opt-in Core preview and final export adapter.

## Props and adapters

- [`ImageMarkerEditorProps`](/guides/editor/reference/interfaces/imagemarkereditorprops/)
- [`ImageMarkerEditorToolbarProps`](/guides/editor/reference/interfaces/imagemarkereditortoolbarprops/)
- [`ImageMarkerEditorRenderAdapter`](/guides/editor/reference/interfaces/imagemarkereditorrenderadapter/)
- [`EditorRenderRequest`](/guides/editor/reference/interfaces/editorrenderrequest/)

## State and export

- [`EditorState`](/guides/editor/reference/interfaces/editorstate/)
- [`EditorSafeArea`](/guides/editor/reference/interfaces/editorsafearea/)
- [`EditorSnapContext`](/guides/editor/reference/interfaces/editorsnapcontext/)
- [`EditorExportOptions`](/guides/editor/reference/interfaces/editorexportoptions/)
- [`EditorExportResult`](/guides/editor/reference/interfaces/editorexportresult/)

Return to the [integration guide](/guides/editor/) or
[open the Editor Playground](/playground/?workflow=editor#editor-playground).
