---
editUrl: false
next: false
prev: false
title: "ImageMarkerEditorProps"
---

Defined in: [packages/editor/src/EditorSurface.tsx:28](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L28)

## Properties

### background?

> `optional` **background?**: `ReactNode`

Defined in: [packages/editor/src/EditorSurface.tsx:32](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L32)

***

### controller

> **controller**: [`ImageMarkerEditorController`](/guides/editor/reference/classes/imagemarkereditorcontroller/)

Defined in: [packages/editor/src/EditorSurface.tsx:29](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L29)

***

### getLayerSize?

> `optional` **getLayerSize?**: (`layer`) => [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/EditorSurface.tsx:35](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L35)

#### Parameters

##### layer

[`WatermarkRecipeDefinitionLayer`](/guides/editor/reference/type-aliases/watermarkrecipedefinitionlayer/)

#### Returns

[`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

***

### height

> **height**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:31](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L31)

***

### onStateChange?

> `optional` **onStateChange?**: (`state`) => `void`

Defined in: [packages/editor/src/EditorSurface.tsx:40](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L40)

#### Parameters

##### state

[`EditorState`](/guides/editor/reference/interfaces/editorstate/)

#### Returns

`void`

***

### renderLayer?

> `optional` **renderLayer?**: (`layer`, `selected`) => `ReactNode`

Defined in: [packages/editor/src/EditorSurface.tsx:36](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L36)

#### Parameters

##### layer

[`WatermarkRecipeDefinitionLayer`](/guides/editor/reference/type-aliases/watermarkrecipedefinitionlayer/)

##### selected

`boolean`

#### Returns

`ReactNode`

***

### snapThreshold?

> `optional` **snapThreshold?**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:34](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L34)

***

### style?

> `optional` **style?**: `StyleProp`\<`ViewStyle`\>

Defined in: [packages/editor/src/EditorSurface.tsx:33](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L33)

***

### width

> **width**: `number`

Defined in: [packages/editor/src/EditorSurface.tsx:30](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/EditorSurface.tsx#L30)
