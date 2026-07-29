---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorProps"
---

Defined in: [packages/editor/src/EditorSurface.tsx:35](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L35)

## Properties

### background?

> `optional` **background?**: `ReactNode`

Defined in: [packages/editor/src/EditorSurface.tsx:47](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L47)

***

### controller

> **controller**: [`ImageMarkerEditorController`](/guides/editor/reference/classes/imagemarkereditorcontroller/)

Defined in: [packages/editor/src/EditorSurface.tsx:36](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L36)

***

### getLayerSize?

> `optional` **getLayerSize?**: (`layer`) => [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/EditorSurface.tsx:50](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L50)

#### Parameters

##### layer

[`WatermarkRecipeDefinitionLayer`](/guides/editor/reference/type-aliases/watermarkrecipedefinitionlayer/)

#### Returns

[`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

***

### height

> **height**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:38](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L38)

***

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Defined in: [packages/editor/src/EditorSurface.tsx:56](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L56)

#### Parameters

##### state

[`EditorState`](/guides/editor/reference/interfaces/editorstate/)

#### Returns

`void`

***

### renderLayer?

> `optional` **renderLayer?**: (`layer`, `selected`, `context`) => `ReactNode`

Defined in: [packages/editor/src/EditorSurface.tsx:51](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L51)

#### Parameters

##### layer

[`WatermarkRecipeDefinitionLayer`](/guides/editor/reference/type-aliases/watermarkrecipedefinitionlayer/)

##### selected

`boolean`

##### context

[`EditorLayerRenderContext`](/guides/editor/reference/interfaces/editorlayerrendercontext/)

#### Returns

`ReactNode`

***

### snapThreshold?

> `optional` **snapThreshold?**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:49](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L49)

***

### sourceSize?

> `optional` **sourceSize?**: [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/EditorSurface.tsx:46](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L46)

Original background dimensions used by Recipe pixel coordinates. When
omitted, the viewport dimensions remain the coordinate space for backward
compatibility.

***

### style?

> `optional` **style?**: `StyleProp`\<`ViewStyle`\>

Defined in: [packages/editor/src/EditorSurface.tsx:48](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L48)

***

### testID?

> `optional` **testID?**: `string`

Defined in: [packages/editor/src/EditorSurface.tsx:40](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L40)

Stable identifier for native E2E and application component tests.

***

### width

> **width**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:37](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L37)
