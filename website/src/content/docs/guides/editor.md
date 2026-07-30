---
title: Optional interaction editor
description: Build a visual Recipe v2 workspace with react-native-image-marker-editor 0.3 and Core 2.1.
---

`react-native-image-marker-editor@0.3` is an optional React Native and Web
interaction package. It owns Recipe state, selection, gestures, history,
panels, templates, and persistence. Core 2.1 owns image inspection, preview
rendering, composition, and encoding.

```sh
npm install react-native-image-marker@^2.1 \
  react-native-image-marker-editor@^0.3
```

## Complete workspace

```tsx
import { Image, StyleSheet } from 'react-native';
import {
  ImageMarkerEditor,
  ImageMarkerEditorAssetPanel,
  ImageMarkerEditorController,
  ImageMarkerEditorInspector,
  ImageMarkerEditorLayerPanel,
  ImageMarkerEditorToolbar,
} from 'react-native-image-marker-editor';
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';

const adapter = createCoreEditorAdapter(1024);
const controller = new ImageMarkerEditorController({
  schemaVersion: 2,
  layers: [
    {
      id: 'title',
      name: 'Campaign title',
      type: 'text',
      text: 'IMAGE MARKER 2.1',
      position: { X: 160, Y: 120 },
      style: { color: '#FFFFFF', fontSize: 64, bold: true },
    },
  ],
  output: { saveFormat: 'png' },
});

<ImageMarkerEditorToolbar controller={controller} />;
<ImageMarkerEditor
  adapter={adapter}
  background={
    <Image source={imageSource} style={StyleSheet.absoluteFill} />
  }
  controller={controller}
  source={imageSource}
  width={720}
  height={405}
/>;
<ImageMarkerEditorLayerPanel controller={controller} />;
<ImageMarkerEditorInspector controller={controller} />;
<ImageMarkerEditorAssetPanel
  assets={[{ id: 'logo', name: 'Logo', source: logoSource }]}
  controller={controller}
/>;
```

Passing `source` and the Core adapter lets Core 2.1 read decoded dimensions and
encoded orientation automatically. Numeric Recipe coordinates stay in
original-image pixels; `sourceSize` is only an override for a custom renderer.

## Preview and export

```ts
const request = {
  recipe: controller.exportRecipe(),
  input: { backgroundImage: { src: imageSource } },
  control: { timeoutMs: 20_000 },
};

const preview = await adapter.renderPreview(request);
const exported = await adapter.exportOriginal(request);

console.log(preview.uri, exported.final.uri);
```

The bounded preview and original export use the same Recipe coordinate space,
so text, images, scale, and position remain aligned.

## Editor 0.3 capabilities

- Toolbar, Inspector, Layer Panel, and reusable Asset Panel components.
- Text typography, color, opacity, stroke and blend-mode editing.
- Image add/replacement, brand colors, fonts, assets, and Logo presets.
- Multi-select, duplicate, group, ungroup, align, distribute, copy, and paste.
- Drag, pinch, resize and rotate handles, zoom, pan, fit, safe area, and snap.
- Rename, lock, visibility, delete, z-order, keyboard shortcuts, undo, and redo.
- Optional autosave, controlled state, templates, placeholders, conditions,
  custom component slots, and plugins.

Controller operations are atomic and undoable:

```ts
controller.selectLayers(['title', 'logo']);
controller.groupLayers();
controller.alignLayers('center', measuredBounds);
controller.distributeLayers('horizontal', measuredBounds);

const portableClipboard = controller.copyLayers();
otherController.pasteLayers(portableClipboard);
```

## Examples, tests, and API

The [live Playground](/playground/?workflow=editor#editor-playground) runs the
real Editor controller and Core adapter. It keeps the rendered result beside
the canvas as a tab, and exposes the integration code and live Recipe.

The repository also contains the
[complete native component guide](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/docs/editor.md),
the [React Native example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example),
unit tests, and native Editor E2E coverage.

Browse the generated [Editor API reference](/guides/editor/reference/) for
controller methods, component props, adapters, templates, persistence, safe
area, snapping, and plugin types.

## Rendering boundaries

The main Editor entry does not force an image renderer into your bundle. Import
the explicit `/core-adapter` subpath for on-device rendering, or inject an
`ImageMarkerEditorRenderAdapter` backed by [`@image-marker/node`](/node/) when
previews and exports belong on a server. Video, generic filters, cloud asset
management, and cloud collaboration are intentionally outside Editor 0.3.
