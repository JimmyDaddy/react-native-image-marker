---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorController"
---

Defined in: [packages/editor/src/controller.ts:129](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L129)

Headless state engine shared by native and Web editor surfaces.

Recipe state, multi-selection, history, clipboard, grouping, alignment,
viewport state, and optional autosave live here. Rendering and application
design-system choices remain injectable.

## Constructors

### Constructor

> **new ImageMarkerEditorController**(`document`, `historyLimit?`): `ImageMarkerEditorController`

Defined in: [packages/editor/src/controller.ts:153](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L153)

#### Parameters

##### document

`WatermarkRecipeDocument`

##### historyLimit?

`number`

#### Returns

`ImageMarkerEditorController`

### Constructor

> **new ImageMarkerEditorController**(`options`): `ImageMarkerEditorController`

Defined in: [packages/editor/src/controller.ts:154](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L154)

#### Parameters

##### options

[`ImageMarkerEditorControllerOptions`](/guides/editor/reference/interfaces/imagemarkereditorcontrolleroptions/)

#### Returns

`ImageMarkerEditorController`

## Methods

### addLayer()

> **addLayer**(`layer`, `index?`): `string`

Defined in: [packages/editor/src/controller.ts:288](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L288)

#### Parameters

##### layer

`WatermarkRecipeLayer`

##### index?

`number` = `...`

#### Returns

`string`

***

### alignLayers()

> **alignLayers**(`alignment`, `bounds`, `canvas?`): `void`

Defined in: [packages/editor/src/controller.ts:561](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L561)

#### Parameters

##### alignment

[`EditorAlignment`](/guides/editor/reference/type-aliases/editoralignment/)

##### bounds

readonly [`EditorLayerBounds`](/guides/editor/reference/interfaces/editorlayerbounds/)[]

##### canvas?

###### height

`number`

###### width

`number`

#### Returns

`void`

***

### applyTemplate()

> **applyTemplate**(`template`): `void`

Defined in: [packages/editor/src/controller.ts:280](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L280)

#### Parameters

##### template

[`EditorTemplate`](/guides/editor/reference/interfaces/editortemplate/)

#### Returns

`void`

***

### beginHistoryGroup()

> **beginHistoryGroup**(): `void`

Defined in: [packages/editor/src/controller.ts:204](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L204)

#### Returns

`void`

***

### canPaste()

> **canPaste**(): `boolean`

Defined in: [packages/editor/src/controller.ts:662](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L662)

#### Returns

`boolean`

***

### clearAutosave()

> **clearAutosave**(): `Promise`\<`boolean`\>

Defined in: [packages/editor/src/controller.ts:904](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L904)

#### Returns

`Promise`\<`boolean`\>

***

### clearSelection()

> **clearSelection**(): `void`

Defined in: [packages/editor/src/controller.ts:248](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L248)

#### Returns

`void`

***

### copyLayers()

> **copyLayers**(`ids?`): `string`

Defined in: [packages/editor/src/controller.ts:645](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L645)

#### Parameters

##### ids?

readonly `string`[] = `...`

#### Returns

`string`

***

### dispose()

> **dispose**(): `void`

Defined in: [packages/editor/src/controller.ts:198](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L198)

#### Returns

`void`

***

### distributeLayers()

> **distributeLayers**(`direction`, `bounds`): `void`

Defined in: [packages/editor/src/controller.ts:601](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L601)

#### Parameters

##### direction

[`EditorDistribution`](/guides/editor/reference/type-aliases/editordistribution/)

##### bounds

readonly [`EditorLayerBounds`](/guides/editor/reference/interfaces/editorlayerbounds/)[]

#### Returns

`void`

***

### duplicateLayers()

> **duplicateLayers**(`ids?`): `string`[]

Defined in: [packages/editor/src/controller.ts:312](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L312)

#### Parameters

##### ids?

readonly `string`[] = `...`

#### Returns

`string`[]

***

### endHistoryGroup()

> **endHistoryGroup**(): `void`

Defined in: [packages/editor/src/controller.ts:209](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L209)

#### Returns

`void`

***

### exportRecipe()

> **exportRecipe**(): `WatermarkRecipeDefinition`

Defined in: [packages/editor/src/controller.ts:284](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L284)

#### Returns

`WatermarkRecipeDefinition`

***

### fitViewport()

> **fitViewport**(): `void`

Defined in: [packages/editor/src/controller.ts:753](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L753)

#### Returns

`void`

***

### flushAutosave()

> **flushAutosave**(): `Promise`\<`boolean`\>

Defined in: [packages/editor/src/controller.ts:896](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L896)

#### Returns

`Promise`\<`boolean`\>

***

### getState()

> **getState**(): [`EditorState`](/guides/editor/reference/interfaces/editorstate/)

Defined in: [packages/editor/src/controller.ts:177](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L177)

#### Returns

[`EditorState`](/guides/editor/reference/interfaces/editorstate/)

***

### groupLayers()

> **groupLayers**(`ids?`, `requestedGroupId?`): `string`

Defined in: [packages/editor/src/controller.ts:517](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L517)

#### Parameters

##### ids?

readonly `string`[] = `...`

##### requestedGroupId?

`string`

#### Returns

`string`

***

### handleKeyCommand()

> **handleKeyCommand**(`command`): `boolean`

Defined in: [packages/editor/src/controller.ts:762](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L762)

#### Parameters

##### command

[`EditorKeyCommand`](/guides/editor/reference/interfaces/editorkeycommand/)

#### Returns

`boolean`

***

### importRecipe()

> **importRecipe**(`document`): `void`

Defined in: [packages/editor/src/controller.ts:272](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L272)

#### Parameters

##### document

`WatermarkRecipeDocument`

#### Returns

`void`

***

### moveLayer()

> **moveLayer**(`id`, `point`, `snapContext?`): [`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

Defined in: [packages/editor/src/controller.ts:420](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L420)

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

Defined in: [packages/editor/src/controller.ts:449](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L449)

#### Parameters

##### id

`string`

##### delta

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

#### Returns

`void`

***

### nudgeSelection()

> **nudgeSelection**(`delta`): `void`

Defined in: [packages/editor/src/controller.ts:457](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L457)

#### Parameters

##### delta

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

#### Returns

`void`

***

### panViewport()

> **panViewport**(`delta`): `void`

Defined in: [packages/editor/src/controller.ts:741](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L741)

#### Parameters

##### delta

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

#### Returns

`void`

***

### pasteLayers()

> **pasteLayers**(`serialized?`, `offset?`): `string`[]

Defined in: [packages/editor/src/controller.ts:666](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L666)

#### Parameters

##### serialized?

`string` \| [`EditorClipboardDocument`](/guides/editor/reference/interfaces/editorclipboarddocument/)

##### offset?

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/) = `...`

#### Returns

`string`[]

***

### patchLayer()

> **patchLayer**(`id`, `patch`): `void`

Defined in: [packages/editor/src/controller.ts:375](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L375)

#### Parameters

##### id

`string`

##### patch

`Partial`\<`WatermarkRecipeDefinitionLayer`\>

#### Returns

`void`

***

### redo()

> **redo**(): `boolean`

Defined in: [packages/editor/src/controller.ts:845](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L845)

#### Returns

`boolean`

***

### removeLayer()

> **removeLayer**(`id?`): `boolean`

Defined in: [packages/editor/src/controller.ts:337](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L337)

#### Parameters

##### id?

`string` \| `undefined`

#### Returns

`boolean`

***

### removeLayers()

> **removeLayers**(`ids?`): `number`

Defined in: [packages/editor/src/controller.ts:342](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L342)

#### Parameters

##### ids?

readonly `string`[] = `...`

#### Returns

`number`

***

### renameLayer()

> **renameLayer**(`id`, `name`): `void`

Defined in: [packages/editor/src/controller.ts:370](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L370)

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

Defined in: [packages/editor/src/controller.ts:502](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L502)

#### Parameters

##### id

`string`

##### targetIndex

`number`

#### Returns

`void`

***

### replaceImage()

> **replaceImage**(`id`, `source`): `void`

Defined in: [packages/editor/src/controller.ts:411](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L411)

#### Parameters

##### id

`string`

##### source

`unknown`

#### Returns

`void`

***

### replaceState()

> **replaceState**(`state`, `recordHistory?`): `void`

Defined in: [packages/editor/src/controller.ts:256](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L256)

Synchronize a controlled Editor state. History capture is opt-in so parent
renders do not create undo entries.

#### Parameters

##### state

[`EditorState`](/guides/editor/reference/interfaces/editorstate/)

##### recordHistory?

`boolean` = `false`

#### Returns

`void`

***

### restoreAutosave()

> **restoreAutosave**(): `Promise`\<`boolean`\>

Defined in: [packages/editor/src/controller.ts:888](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L888)

#### Returns

`Promise`\<`boolean`\>

***

### restoreSerializedState()

> **restoreSerializedState**(`serialized`): `void`

Defined in: [packages/editor/src/controller.ts:867](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L867)

#### Parameters

##### serialized

`string`

#### Returns

`void`

***

### rotateLayer()

> **rotateLayer**(`id`, `degrees`): `void`

Defined in: [packages/editor/src/controller.ts:485](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L485)

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

Defined in: [packages/editor/src/controller.ts:468](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L468)

#### Parameters

##### id

`string`

##### scale

`number`

#### Returns

`void`

***

### selectAll()

> **selectAll**(): `void`

Defined in: [packages/editor/src/controller.ts:243](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L243)

#### Returns

`void`

***

### selectLayer()

> **selectLayer**(`id`, `mode?`): `void`

Defined in: [packages/editor/src/controller.ts:216](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L216)

#### Parameters

##### id

`string` \| `undefined`

##### mode?

[`EditorSelectionMode`](/guides/editor/reference/type-aliases/editorselectionmode/) = `'replace'`

#### Returns

`void`

***

### selectLayers()

> **selectLayers**(`ids`): `void`

Defined in: [packages/editor/src/controller.ts:237](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L237)

#### Parameters

##### ids

readonly `string`[]

#### Returns

`void`

***

### serializeState()

> **serializeState**(): `string`

Defined in: [packages/editor/src/controller.ts:854](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L854)

#### Returns

`string`

***

### setExportOptions()

> **setExportOptions**(`options`): `void`

Defined in: [packages/editor/src/controller.ts:709](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L709)

#### Parameters

##### options

[`EditorExportOptions`](/guides/editor/reference/interfaces/editorexportoptions/)

#### Returns

`void`

***

### setLayerLocked()

> **setLayerLocked**(`id`, `locked`): `void`

Defined in: [packages/editor/src/controller.ts:361](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L361)

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

Defined in: [packages/editor/src/controller.ts:357](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L357)

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

Defined in: [packages/editor/src/controller.ts:703](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L703)

#### Parameters

##### safeArea

`Partial`\<[`EditorSafeArea`](/guides/editor/reference/interfaces/editorsafearea/)\>

#### Returns

`void`

***

### setViewportZoom()

> **setViewportZoom**(`zoom`, `anchor?`): `void`

Defined in: [packages/editor/src/controller.ts:715](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L715)

#### Parameters

##### zoom

`number`

##### anchor?

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

#### Returns

`void`

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Defined in: [packages/editor/src/controller.ts:192](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L192)

#### Parameters

##### listener

`Listener`

#### Returns

() => `void`

***

### undo()

> **undo**(): `boolean`

Defined in: [packages/editor/src/controller.ts:836](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L836)

#### Returns

`boolean`

***

### ungroupLayers()

> **ungroupLayers**(`ids?`): `string`[]

Defined in: [packages/editor/src/controller.ts:536](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L536)

#### Parameters

##### ids?

readonly `string`[] = `...`

#### Returns

`string`[]

***

### updateTextLayer()

> **updateTextLayer**(`id`, `patch`): `void`

Defined in: [packages/editor/src/controller.ts:396](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L396)

#### Parameters

##### id

`string`

##### patch

[`EditorTextLayerPatch`](/guides/editor/reference/type-aliases/editortextlayerpatch/)

#### Returns

`void`

***

### zoomViewportBy()

> **zoomViewportBy**(`factor`, `anchor?`): `void`

Defined in: [packages/editor/src/controller.ts:737](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/controller.ts#L737)

#### Parameters

##### factor

`number`

##### anchor?

[`EditorPoint`](/guides/editor/reference/interfaces/editorpoint/)

#### Returns

`void`
