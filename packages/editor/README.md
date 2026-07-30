# react-native-image-marker-editor

Optional React Native and Web interaction editor for
`react-native-image-marker@2.1`. Editor state is a portable Recipe v2 document,
so the same result can be rendered by Core, Node, or the CLI.

```sh
npm install react-native-image-marker@^2.1 \
  react-native-image-marker-editor@^0.3
```

## Quick start

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
      type: 'text',
      text: 'Draft',
      position: { X: 80, Y: 64 },
      style: { color: '#FFFFFF', fontSize: 52, bold: true },
    },
  ],
  output: { saveFormat: 'png' },
});

<ImageMarkerEditorToolbar controller={controller} />;
<ImageMarkerEditor
  adapter={adapter}
  controller={controller}
  source={imageSource}
  width={720}
  height={405}
  background={<Image source={imageSource} style={StyleSheet.absoluteFill} />}
/>;
<ImageMarkerEditorLayerPanel controller={controller} />;
<ImageMarkerEditorInspector controller={controller} />;
<ImageMarkerEditorAssetPanel
  assets={[{ id: 'logo', name: 'Logo', source: logoSource }]}
  controller={controller}
/>;
```

Passing `source` and the Core adapter automatically resolves the decoded
dimensions and encoded orientation with `Marker.getImageInfo`. Numeric Recipe
coordinates therefore remain in original-image pixels without a manually
maintained `sourceSize`. An explicit `sourceSize` still overrides detection for
custom renderers.

Render a preview or export at original resolution:

```ts
const request = {
  recipe: controller.exportRecipe(),
  input: { backgroundImage: { src: imageSource } },
};

const preview = await adapter.renderPreview(request);
const exported = await adapter.exportOriginal(request);
```

## Editor 0.3 capabilities

- Rich text content, font, size, color, opacity, stroke, and blend-mode editing.
- Image selection, replacement, reusable assets, Logo presets, brand colors,
  and fonts.
- Multi-selection, duplicate, group, ungroup, align, distribute, copy, paste,
  and portable cross-document clipboard JSON.
- Layer rename, lock, visibility, delete, and z-order controls.
- Drag, pinch, resize handles, rotation handle, safe area, snap guides, canvas
  zoom, pan, fit, keyboard shortcuts, undo, and redo.
- Optional autosave/restore, controlled state, templates, placeholders,
  conditional layers, custom component slots, and plugin slots.
- Injectable rendering with a separate opt-in Core adapter.

## Multi-selection and clipboard

```ts
controller.selectLayers(['title', 'logo']);
controller.groupLayers();
controller.alignLayers('center', measuredBounds);
controller.distributeLayers('horizontal', measuredBounds);

const portableClipboard = controller.copyLayers();
otherController.pasteLayers(portableClipboard);
```

Keyboard commands include Undo/Redo, Select all, Copy/Cut/Paste, Duplicate,
Group/Ungroup, Delete, arrow-key nudging, z-order brackets, zoom, and fit.

## Autosave and controlled state

```ts
const controller = new ImageMarkerEditorController({
  document: initialRecipe,
  autosave: {
    key: 'campaign-draft',
    storage: {
      load: (key) => AsyncStorage.getItem(key),
      save: (key, value) => AsyncStorage.setItem(key, value),
      remove: (key) => AsyncStorage.removeItem(key),
    },
  },
  onChange: setEditorState,
});

await controller.restoreAutosave();
await controller.flushAutosave();

// Synchronize a parent-controlled state without creating an undo record.
controller.replaceState(editorState);
```

## Templates, placeholders, and brand presets

```ts
import {
  createEditorTemplate,
  materializeEditorTemplate,
} from 'react-native-image-marker-editor';

const template = createEditorTemplate({
  id: 'social-card',
  name: 'Social card',
  recipe: {
    schemaVersion: 2,
    layers: [{ id: 'title', type: 'text', text: 'Hello {{name}}' }],
    output: { saveFormat: 'png' },
  },
});

const recipe = materializeEditorTemplate(template, {
  variables: { name: 'Ada' },
});
```

## Custom UI and plugins

All panels accept header, footer, and custom render slots. The canvas accepts
`renderLayer`, `canvasOverlay`, and `selectionOverlay`. A plugin can contribute
toolbar actions, inspector sections, and canvas overlays:

```ts
const plugin = {
  id: 'campaign-rules',
  toolbarActions: [
    {
      id: 'approve',
      label: 'Approve',
      onPress: ({ state }) => approve(state.recipe),
    },
  ],
  renderInspectorSection: ({ state }) => (
    <CampaignRules recipe={state.recipe} />
  ),
};
```

The main entry owns UI and Recipe state only. Import
`react-native-image-marker-editor/core-adapter` when the editor should invoke
Core, or inject a custom adapter backed by a server renderer.

See the [complete repository guide](../../docs/editor.md), run the React Native
example and choose **Editor 0.3.0**, or open the
[browser Playground](https://image-marker.corerobin.com/playground/?workflow=editor#editor-playground).
