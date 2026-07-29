---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorRenderAdapter"
---

Defined in: [packages/editor/src/types.ts:97](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L97)

Rendering remains injectable. The editor package owns interaction state,
while Core or an application adapter owns image decoding and encoding.

## Methods

### exportOriginal()

> **exportOriginal**(`request`): `Promise`\<[`EditorExportResult`](/guides/editor/reference/interfaces/editorexportresult/)\>

Defined in: [packages/editor/src/types.ts:101](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L101)

#### Parameters

##### request

[`EditorRenderRequest`](/guides/editor/reference/interfaces/editorrenderrequest/) & `object`

#### Returns

`Promise`\<[`EditorExportResult`](/guides/editor/reference/interfaces/editorexportresult/)\>

***

### renderPreview()

> **renderPreview**(`request`): `Promise`\<`MarkerResult`\>

Defined in: [packages/editor/src/types.ts:98](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L98)

#### Parameters

##### request

[`EditorRenderRequest`](/guides/editor/reference/interfaces/editorrenderrequest/) & `object`

#### Returns

`Promise`\<`MarkerResult`\>
