---
editUrl: false
next: false
prev: false
title: "EditorRenderRequest"
---

Defined in: [packages/editor/src/types.ts:76](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L76)

## Properties

### control?

> `optional` **control?**: `MarkerJobOptions`

Defined in: [packages/editor/src/types.ts:85](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L85)

***

### input

> **input**: [`WatermarkRecipeInput`](/guides/editor/reference/interfaces/watermarkrecipeinput/)

Defined in: [packages/editor/src/types.ts:78](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L78)

***

### recipe

> **recipe**: [`WatermarkRecipeDefinition`](/guides/editor/reference/interfaces/watermarkrecipedefinition/)

Defined in: [packages/editor/src/types.ts:77](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L77)

***

### sourceSize?

> `optional` **sourceSize?**: [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/types.ts:84](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L84)

Pixel dimensions of the background before Core applies output.maxSize.
Providing this keeps numeric Recipe coordinates visually stable between
the interactive surface, bounded previews, and original export.
