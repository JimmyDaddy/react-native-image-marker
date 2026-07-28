---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorController"
---

Defined in: [packages/editor/src/controller.ts:130](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L130)

Headless state engine shared by native and Web editor surfaces.

All rendering-relevant state is stored as Recipe v2. UI-only history,
selection, guides, and safe-area settings stay outside the serialized recipe.

## Constructors

### Constructor

> **new ImageMarkerEditorController**(`document`, `historyLimit?`): `ImageMarkerEditorController`

Defined in: [packages/editor/src/controller.ts:143](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L143)

#### Parameters

##### document

[`WatermarkRecipeDocument`](/guides/editor/reference/type-aliases/watermarkrecipedocument/)

##### historyLimit?

`number` = `100`

#### Returns

`ImageMarkerEditorController`

## Methods

### addLayer()

> **addLayer**(`layer`, `index?`): `string`

Defined in: [packages/editor/src/controller.ts:202](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L202)

#### Parameters

##### layer

`WatermarkRecipeLayer`

##### index?

`number` = `...`

#### Returns

`string`

***

### beginHistoryGroup()

> **beginHistoryGroup**(): `void`

Defined in: [packages/editor/src/controller.ts:170](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L170)

#### Returns

`void`

***

### endHistoryGroup()

> **endHistoryGroup**(): `void`

Defined in: [packages/editor/src/controller.ts:175](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L175)

#### Returns

`void`

***

### exportRecipe()

> **exportRecipe**(): [`WatermarkRecipeDefinition`](/guides/editor/reference/interfaces/watermarkrecipedefinition/)

Defined in: [packages/editor/src/controller.ts:198](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L198)

#### Returns

[`WatermarkRecipeDefinition`](/guides/editor/reference/interfaces/watermarkrecipedefinition/)

***

### getState()

> **getState**(): [`EditorState`](/guides/editor/reference/interfaces/editorstate/)

Defined in: [packages/editor/src/controller.ts:152](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L152)

#### Returns

[`EditorState`](/guides/editor/reference/interfaces/editorstate/)

***

### handleKeyCommand()

> **handleKeyCommand**(`command`): `boolean`

Defined in: [packages/editor/src/controller.ts:354](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L354)

#### Parameters

##### command

[`EditorKeyCommand`](/guides/editor/reference/interfaces/editorkeycommand/)

#### Returns

`boolean`

***

### importRecipe()

> **importRecipe**(`document`): `void`

Defined in: [packages/editor/src/controller.ts:190](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L190)

#### Parameters

##### document

[`WatermarkRecipeDocument`](/guides/editor/reference/type-aliases/watermarkrecipedocument/)

#### Returns

`void`

***

### moveLayer()

> **moveLayer**(`id`, `point`, `snapContext?`): [`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

Defined in: [packages/editor/src/controller.ts:259](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L259)

#### Parameters

##### id

`string`

##### point

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

##### snapContext?

[`EditorSnapContext`](/guides/editor/reference/interfaces/editorsnapcontext/)

#### Returns

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

***

### nudgeLayer()

> **nudgeLayer**(`id`, `delta`): `void`

Defined in: [packages/editor/src/controller.ts:282](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L282)

#### Parameters

##### id

`string`

##### delta

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

#### Returns

`void`

***

### redo()

> **redo**(): `boolean`

Defined in: [packages/editor/src/controller.ts:391](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L391)

#### Returns

`boolean`

***

### removeLayer()

> **removeLayer**(`id?`): `boolean`

Defined in: [packages/editor/src/controller.ts:226](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L226)

#### Parameters

##### id?

`string` \| `undefined`

#### Returns

`boolean`

***

### renameLayer()

> **renameLayer**(`id`, `name`): `void`

Defined in: [packages/editor/src/controller.ts:251](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L251)

#### Parameters

##### id

`string`

##### name

`string` \| `undefined`

#### Returns

`void`

***

### reorderLayer()

> **reorderLayer**(`id`, `targetIndex`): `void`

Defined in: [packages/editor/src/controller.ts:327](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L327)

#### Parameters

##### id

`string`

##### targetIndex

`number`

#### Returns

`void`

***

### rotateLayer()

> **rotateLayer**(`id`, `degrees`): `void`

Defined in: [packages/editor/src/controller.ts:309](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L309)

#### Parameters

##### id

`string`

##### degrees

`number`

#### Returns

`void`

***

### scaleLayer()

> **scaleLayer**(`id`, `scale`): `void`

Defined in: [packages/editor/src/controller.ts:290](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L290)

#### Parameters

##### id

`string`

##### scale

`number`

#### Returns

`void`

***

### selectLayer()

> **selectLayer**(`id`): `void`

Defined in: [packages/editor/src/controller.ts:182](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L182)

#### Parameters

##### id

`string` \| `undefined`

#### Returns

`void`

***

### setExportOptions()

> **setExportOptions**(`options`): `void`

Defined in: [packages/editor/src/controller.ts:348](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L348)

#### Parameters

##### options

[`EditorExportOptions`](/guides/editor/reference/interfaces/editorexportoptions/)

#### Returns

`void`

***

### setLayerLocked()

> **setLayerLocked**(`id`, `locked`): `void`

Defined in: [packages/editor/src/controller.ts:242](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L242)

#### Parameters

##### id

`string`

##### locked

`boolean`

#### Returns

`void`

***

### setLayerVisible()

> **setLayerVisible**(`id`, `visible`): `void`

Defined in: [packages/editor/src/controller.ts:238](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L238)

#### Parameters

##### id

`string`

##### visible

`boolean`

#### Returns

`void`

***

### setSafeArea()

> **setSafeArea**(`safeArea`): `void`

Defined in: [packages/editor/src/controller.ts:342](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L342)

#### Parameters

##### safeArea

`Partial`\<[`EditorSafeArea`](/guides/editor/reference/interfaces/editorsafearea/)\>

#### Returns

`void`

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Defined in: [packages/editor/src/controller.ts:164](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L164)

#### Parameters

##### listener

`Listener`

#### Returns

() => `void`

***

### undo()

> **undo**(): `boolean`

Defined in: [packages/editor/src/controller.ts:382](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L382)

#### Returns

`boolean`
