---
editUrl: false
next: false
prev: false
title: "createCoreEditorAdapter"
---

> **createCoreEditorAdapter**(`previewMaxSize?`): [`ImageMarkerEditorRenderAdapter`](/guides/editor/reference/interfaces/imagemarkereditorrenderadapter/)

Defined in: [packages/editor/src/core-adapter.ts:41](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/core-adapter.ts#L41)

Lightweight default adapter. Import this opt-in entry only when the editor
should invoke Core directly; applications can inject a server or custom
preview adapter through the main package without importing this module.

## Parameters

### previewMaxSize?

`number` = `1024`

## Returns

[`ImageMarkerEditorRenderAdapter`](/guides/editor/reference/interfaces/imagemarkereditorrenderadapter/)
