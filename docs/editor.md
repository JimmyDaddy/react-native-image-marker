# Optional interaction editor

`react-native-image-marker-editor@0.3` is the optional React Native and Web
interaction layer for `react-native-image-marker@2.1`. It owns Recipe state,
selection, gestures, history, panels, templates, and persistence. Core owns
image decoding, composition, preview rendering, and encoding.

## Install

```sh
npm install react-native-image-marker@^2.1 \
  react-native-image-marker-editor@^0.3
```

The Editor depends on the platform-neutral `@image-marker/recipe` package and
uses the same Recipe v2 document as Web, Node, and CLI. Import the Core adapter
only when previews or exports should run on the device:

```ts
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';
```

Applications can inject another `ImageMarkerEditorRenderAdapter` when rendering
belongs on a server.

## Complete component

Core 2.1 automatically reads the original dimensions and encoded orientation.
The application no longer needs to maintain a matching `sourceSize`.

```tsx
import * as React from 'react';
import {
  Button,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ImageMarkerEditor,
  ImageMarkerEditorAssetPanel,
  ImageMarkerEditorController,
  ImageMarkerEditorInspector,
  ImageMarkerEditorLayerPanel,
  ImageMarkerEditorToolbar,
} from 'react-native-image-marker-editor';
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';

const background = require('../assets/background.jpg');
const logo = require('../assets/logo.png');
const adapter = createCoreEditorAdapter(1024);

export function WatermarkEditor() {
  const window = useWindowDimensions();
  const width = Math.min(Math.max(window.width - 32, 280), 720);
  const height = Math.round((width * 9) / 16);
  const controller = React.useMemo(
    () =>
      new ImageMarkerEditorController({
        schemaVersion: 2,
        layers: [
          {
            id: 'title',
            name: 'Campaign title',
            type: 'text',
            text: 'IMAGE MARKER 2.1',
            position: { X: 160, Y: 120 },
            style: {
              color: '#FFFFFF',
              fontSize: 64,
              bold: true,
            },
          },
          {
            id: 'logo',
            name: 'Brand mark',
            type: 'image',
            src: logo,
            position: { X: 1280, Y: 720 },
            scale: 0.4,
          },
        ],
        output: { saveFormat: 'png' },
      }),
    []
  );
  const [resultUri, setResultUri] = React.useState<string>();

  const request = () => ({
    recipe: controller.exportRecipe(),
    input: { backgroundImage: { src: background } },
    control: { timeoutMs: 20_000 },
  });

  const renderPreview = async () => {
    const result = await adapter.renderPreview(request());
    setResultUri(result.uri);
  };

  const exportOriginal = async () => {
    const result = await adapter.exportOriginal(request());
    setResultUri(result.final.uri);
  };

  return (
    <View>
      <ImageMarkerEditorToolbar controller={controller} />
      <ImageMarkerEditor
        adapter={adapter}
        background={
          <Image
            resizeMode="contain"
            source={background}
            style={StyleSheet.absoluteFill}
          />
        }
        controller={controller}
        height={height}
        snapThreshold={8}
        source={background}
        width={width}
      />
      <ImageMarkerEditorLayerPanel controller={controller} />
      <ImageMarkerEditorInspector
        brandKit={{
          colors: ['#FFFFFF', '#5271FF', '#FF5B45'],
          fonts: ['Inter', 'Courier'],
        }}
        controller={controller}
      />
      <ImageMarkerEditorAssetPanel
        assets={[{ id: 'logo', name: 'Logo', source: logo }]}
        controller={controller}
      />
      <Button title="Render Core preview" onPress={renderPreview} />
      <Button title="Export original" onPress={exportOriginal} />
      {resultUri && (
        <Image
          resizeMode="contain"
          source={{ uri: resultUri }}
          style={{ width, height }}
        />
      )}
    </View>
  );
}
```

`adapter.renderPreview()` creates a bounded render while preserving original
coordinates. `adapter.exportOriginal()` returns the visible render plus the
final result after optional invisible-watermark or Content Credentials work.

## Editing API

The controller provides atomic, undoable commands rather than exposing mutable
state:

```ts
controller.selectLayers(['title', 'logo']);
controller.groupLayers();
controller.alignLayers('center', measuredBounds);
controller.distributeLayers('horizontal', measuredBounds);
controller.duplicateLayers();

controller.updateTextLayer('title', {
  text: 'Launch',
  alpha: 0.8,
  blendMode: 'overlay',
  style: {
    fontName: 'Inter',
    fontSize: 64,
    color: '#FFFFFF',
    strokeStyle: { color: '#0F172A', width: 2 },
  },
});
controller.replaceImage('logo', replacementLogo);
```

The built-in Toolbar, Inspector, Layer Panel, and Asset Panel cover:

- text, typography, color, opacity, stroke, and blend mode;
- image add and replacement;
- duplicate, rename, lock, visibility, delete, and ordering;
- multi-select, group, ungroup, align, distribute, copy, and paste;
- undo, redo, zoom, pan, fit, safe area, snapping, resize, and rotation.

Long-press a layer row to toggle it into a multi-selection. A copied selection
can also cross document boundaries:

```ts
const clipboardJson = controller.copyLayers();
otherController.pasteLayers(clipboardJson, { x: 20, y: 20 });
```

## Keyboard shortcuts

- `Cmd/Ctrl+Z`, `Shift+Cmd/Ctrl+Z`, and `Cmd/Ctrl+Y`: undo and redo.
- `Cmd/Ctrl+A/C/X/V/D`: select all, copy, cut, paste, and duplicate.
- `Cmd/Ctrl+G` and `Shift+Cmd/Ctrl+G`: group and ungroup.
- Arrow keys: move by one pixel; add Shift to move by ten.
- `[` and `]`: move the primary layer through the z-order.
- `Cmd/Ctrl+0`, `+`, and `-`: fit and zoom.
- Delete or Backspace: remove the editable selection.

## Autosave, restore, and controlled state

```ts
const controller = new ImageMarkerEditorController({
  document: initialRecipe,
  autosave: {
    key: 'campaign-draft',
    debounceMs: 350,
    storage: {
      load: (key) => AsyncStorage.getItem(key),
      save: (key, value) => AsyncStorage.setItem(key, value),
      remove: (key) => AsyncStorage.removeItem(key),
    },
    onError: reportAutosaveError,
  },
  onChange: setEditorState,
});

await controller.restoreAutosave();
await controller.flushAutosave();

// Parent-controlled synchronization without another undo record.
controller.replaceState(editorState);
```

`ImageMarkerEditor`, Inspector, Layer Panel, and Asset Panel also accept a
controlled `state` prop. Autosave intentionally excludes invisible-watermark
keys, signing adapters, and export credentials; applications should obtain
those from protected runtime storage at export time.

## Templates and brand kits

Template text uses the same variables and conditional-layer materializer as
the shared Recipe package:

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
    layers: [
      { id: 'title', type: 'text', text: 'Hello {{name}}' },
      {
        id: 'sale',
        type: 'text',
        text: 'Sale',
        visibleWhen: { variable: 'showSale', equals: true },
      },
    ],
    output: { saveFormat: 'png' },
  },
});

const recipe = materializeEditorTemplate(template, {
  variables: { name: 'Ada', showSale: false },
});
```

Use `createEditorBrandKit`, `createBrandTextLayer`, and
`createBrandLogoLayer` to share approved colors, fonts, and Logo assets.

## Custom components and plugins

- Canvas slots: `canvasOverlay`, `selectionOverlay`, and `sourceLoading`.
- Layer rendering: `renderLayer` and `getLayerSize`.
- Panel slots: header, footer, empty state, layer label, and asset renderer.
- Plugin slots: toolbar actions, inspector sections, and canvas overlays.

Plugins are ordinary objects and do not receive global access:

```tsx
const campaignPlugin = {
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

## Coordinate and rendering contract

- Numeric Recipe geometry remains in decoded original-image pixels.
- Core 2.1 obtains display dimensions after applying encoded orientation.
- The surface projects that coordinate space into the zoomed viewport.
- The adapter projects the same Recipe into bounded previews and preserves it
  for original export.
- Pass `sourceSize` only to override automatic detection or when a custom
  adapter cannot inspect the source.
- Fonts, antialiasing, decoding, and encoding may still differ slightly across
  platform renderers.

## Examples, API, and tests

- [Native Editor example](../example/src/EditorExample.tsx)
- [Controller and component tests](../packages/editor/src/__tests__)
- [Browser Playground](https://image-marker.corerobin.com/playground/?workflow=editor#editor-playground)
- [Integration guide](https://image-marker.corerobin.com/guides/editor/)
- [Generated API reference](https://image-marker.corerobin.com/guides/editor/reference/)

The native example exposes stable `testID` values for panels, layer controls,
canvas handles, toolbar actions, preview, export, status, result, and Recipe
assertions. CI covers unit, component, consumer, iOS, and Android workflows.
