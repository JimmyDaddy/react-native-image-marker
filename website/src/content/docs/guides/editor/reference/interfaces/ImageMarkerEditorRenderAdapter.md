---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorRenderAdapter"
---

Defined in: [packages/editor/src/types.ts:195](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L195)

Rendering remains injectable. The editor package owns interaction state,
while Core or an application adapter owns image decoding and encoding.

## Methods

### exportOriginal()

> **exportOriginal**(`request`): `Promise`\<[`EditorExportResult`](/guides/editor/reference/interfaces/editorexportresult/)\>

Defined in: [packages/editor/src/types.ts:200](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L200)

#### Parameters

##### request

[`EditorRenderRequest`](/guides/editor/reference/interfaces/editorrenderrequest/) & `object`

#### Returns

`Promise`\<[`EditorExportResult`](/guides/editor/reference/interfaces/editorexportresult/)\>

***

### getSourceInfo()?

> `optional` **getSourceInfo**(`source`): `Promise`\<[`MarkerImageInfo`](/guides/editor/reference/interfaces/markerimageinfo/)\>

Defined in: [packages/editor/src/types.ts:196](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L196)

#### Parameters

##### source

`unknown`

#### Returns

`Promise`\<[`MarkerImageInfo`](/guides/editor/reference/interfaces/markerimageinfo/)\>

***

### renderPreview()

> **renderPreview**(`request`): `Promise`\<`MarkerResult`\>

Defined in: [packages/editor/src/types.ts:197](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L197)

#### Parameters

##### request

[`EditorRenderRequest`](/guides/editor/reference/interfaces/editorrenderrequest/) & `object`

#### Returns

`Promise`\<`MarkerResult`\>
