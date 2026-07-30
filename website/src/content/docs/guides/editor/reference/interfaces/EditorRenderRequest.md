---
editUrl: false
next: false
prev: false
title: "EditorRenderRequest"
---

Defined in: [packages/editor/src/types.ts:174](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L174)

## Properties

### control?

> `optional` **control?**: `MarkerJobOptions`

Defined in: [packages/editor/src/types.ts:183](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L183)

***

### input

> **input**: [`WatermarkRecipeInput`](/guides/editor/reference/interfaces/watermarkrecipeinput/)

Defined in: [packages/editor/src/types.ts:176](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L176)

***

### recipe

> **recipe**: [`WatermarkRecipeDefinition`](/guides/editor/reference/interfaces/watermarkrecipedefinition/)

Defined in: [packages/editor/src/types.ts:175](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L175)

***

### sourceSize?

> `optional` **sourceSize?**: [`EditorSize`](/guides/editor/reference/interfaces/editorsize/)

Defined in: [packages/editor/src/types.ts:182](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/packages/editor/src/types.ts#L182)

Pixel dimensions of the background before Core applies output.maxSize.
Providing this keeps numeric Recipe coordinates visually stable between
the interactive surface, bounded previews, and original export.
