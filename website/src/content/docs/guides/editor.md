---
title: Optional interaction editor
description: Install and integrate react-native-image-marker-editor 0.0.2 on top of Core 2.
---

`react-native-image-marker-editor` is a separate, optional JS/TS package. Its
first release was `0.0.1`; the current documentation patch is `0.0.2`, and it
requires `react-native-image-marker@^2.0.0`.
Core remains responsible for decode, composition, invisible watermarking, and
final native encoding.

```sh
npm install react-native-image-marker@^2 \
  react-native-image-marker-editor@0.0.2
```

## Create an editor

```tsx
import {
  ImageMarkerEditor,
  ImageMarkerEditorController,
  ImageMarkerEditorToolbar,
} from 'react-native-image-marker-editor';
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';
import { ImageFormat } from 'react-native-image-marker';

const controller = new ImageMarkerEditorController({
  schemaVersion: 2,
  layers: [
    {
      id: 'title',
      name: 'Title',
      type: 'text',
      text: 'Draft',
      position: { X: 80, Y: 60 },
    },
  ],
  output: { saveFormat: ImageFormat.png },
});
const adapter = createCoreEditorAdapter(1024);

<ImageMarkerEditor
  controller={controller}
  width={360}
  height={240}
/>;
<ImageMarkerEditorToolbar controller={controller} />;

const recipe = controller.exportRecipe();
const result = await adapter.exportOriginal({
  recipe,
  input: { backgroundImage: { src: imageSource } },
});

console.log(result.final.uri);
```

## Try the complete example

The [live Playground](/playground/?workflow=editor#editor-playground) uses the actual Editor
controller and Core adapter in the browser. Drag, scale, rotate, reorder, lock,
undo, and render without installing anything.

For the native surface, run the repository
[React Native example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)
and choose **Editor 0.0.2**. It renders `ImageMarkerEditor` and
`ImageMarkerEditorToolbar`, then exercises both preview and original-resolution
Core exports.

## 0.0.x scope

- Image and text layers with selection, dragging, pinch scaling, rotation, and
  ordering.
- Visibility and lock state; locked layers cannot be mutated, deleted, or
  reordered.
- Alignment guides, snapping, and safe-area constraints.
- Grouped undo/redo and Recipe v2 import/export.
- Low-resolution interaction preview and original-resolution export.
- Keyboard commands and baseline accessibility labels/roles.
- Visible, invisible watermark, and optional C2PA export choices.
- Opt-in Core adapter, so the main editor entry does not force a heavy renderer.

Video, general filters, cloud collaboration, and duplicate native encoding are
intentionally outside `0.0.x`.

## API reference

Browse the generated [Editor API reference](/guides/editor/reference/) for
`ImageMarkerEditorController`, component props, render adapters, state,
safe-area and snapping types, export options, and `createCoreEditorAdapter`.

## State and persistence

The controller is the source of truth. Subscribe to its snapshot, preserve
stable Recipe layer IDs, and persist `controller.exportRecipe()`. Importing a
v1 Recipe goes through the Core migration boundary before the controller stores
the v2 document.

Inject your own adapter when previews or final renders happen on a server. The
adapter interface keeps the UI independent from the chosen renderer while the
default Core adapter forwards job cancellation, timeout, and progress options.
