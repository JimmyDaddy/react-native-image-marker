---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorProps"
---

Defined in: [packages/editor/src/EditorSurface.tsx:74](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L74)

## Properties

### adapter?

> `optional` **adapter?**: [`ImageMarkerEditorRenderAdapter`](/guides/editor/reference/interfaces/imagemarkereditorrenderadapter/)

Defined in: [packages/editor/src/EditorSurface.tsx:89](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L89)

***

### background?

> `optional` **background?**: `ReactNode`

Defined in: [packages/editor/src/EditorSurface.tsx:90](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L90)

***

### controller

> **controller**: [`ImageMarkerEditorController`](/guides/editor/reference/classes/imagemarkereditorcontroller/)

Defined in: [packages/editor/src/EditorSurface.tsx:75](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L75)

***

### getLayerSize?

> `optional` **getLayerSize?**: (`layer`) => [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/EditorSurface.tsx:94](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L94)

#### Parameters

##### layer

`WatermarkRecipeDefinitionLayer`

#### Returns

[`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

***

### height

> **height**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:77](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L77)

***

### onSourceInfo?

> `optional` **onSourceInfo?**: (`info`) => `void`

Defined in: [packages/editor/src/EditorSurface.tsx:102](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L102)

#### Parameters

##### info

[`MarkerImageInfo`](/guides/editor/reference/interfaces/markerimageinfo/)

#### Returns

`void`

***

### onSourceInfoError?

> `optional` **onSourceInfoError?**: (`error`) => `void`

Defined in: [packages/editor/src/EditorSurface.tsx:103](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L103)

#### Parameters

##### error

`Error`

#### Returns

`void`

***

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Defined in: [packages/editor/src/EditorSurface.tsx:104](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L104)

#### Parameters

##### state

[`EditorState`](/guides/editor/reference/interfaces/editorstate/)

#### Returns

`void`

***

### plugins?

> `optional` **plugins?**: readonly [`ImageMarkerEditorPlugin`](/guides/editor/reference/interfaces/imagemarkereditorplugin/)[]

Defined in: [packages/editor/src/EditorSurface.tsx:101](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L101)

***

### renderLayer?

> `optional` **renderLayer?**: (`layer`, `selected`, `context`) => `ReactNode`

Defined in: [packages/editor/src/EditorSurface.tsx:95](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L95)

#### Parameters

##### layer

`WatermarkRecipeDefinitionLayer`

##### selected

`boolean`

##### context

[`EditorLayerRenderContext`](/guides/editor/reference/interfaces/editorlayerrendercontext/)

#### Returns

`ReactNode`

***

### showSafeArea?

> `optional` **showSafeArea?**: `boolean`

Defined in: [packages/editor/src/EditorSurface.tsx:93](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L93)

***

### slots?

> `optional` **slots?**: [`EditorComponentSlots`](/guides/editor/reference/interfaces/editorcomponentslots/)

Defined in: [packages/editor/src/EditorSurface.tsx:100](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L100)

***

### snapThreshold?

> `optional` **snapThreshold?**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:92](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L92)

***

### source?

> `optional` **source?**: `unknown`

Defined in: [packages/editor/src/EditorSurface.tsx:88](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L88)

Background image source used for automatic Core 2.1 dimension lookup.

***

### sourceSize?

> `optional` **sourceSize?**: [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/EditorSurface.tsx:86](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L86)

Explicit source dimensions. Usually omitted when `source` and an adapter
with `getSourceInfo` are provided.

***

### state?

> `optional` **state?**: [`EditorState`](/guides/editor/reference/interfaces/editorstate/)

Defined in: [packages/editor/src/EditorSurface.tsx:81](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L81)

Controlled state. Pair with `onStateChange` and controller.replaceState.

***

### style?

> `optional` **style?**: `StyleProp`\<`ViewStyle`\>

Defined in: [packages/editor/src/EditorSurface.tsx:91](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L91)

***

### testID?

> `optional` **testID?**: `string`

Defined in: [packages/editor/src/EditorSurface.tsx:79](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L79)

Stable identifier for native E2E and application component tests.

***

### width

> **width**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:76](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L76)
