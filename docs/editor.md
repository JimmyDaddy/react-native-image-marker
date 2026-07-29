# Optional interaction editor

`react-native-image-marker-editor` is the optional interaction layer for
`react-native-image-marker@2`. It owns Recipe v2 editing state and gestures;
Core still owns image decoding, composition, preview rendering, and final
encoding.

## Install

```sh
npm install react-native-image-marker@^2 \
  react-native-image-marker-editor@0.1.0
```

The Editor is a separate package and version line. Import the Core adapter only
when previews or exports should run on the device:

```ts
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';
```

Applications that render on a server can inject their own
`ImageMarkerEditorRenderAdapter` instead.

## Complete component

The same original `sourceSize` must be passed to the interactive surface and
every Core render request. Numeric Recipe coordinates are measured in those
original-image pixels.

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
  ImageMarkerEditorController,
  ImageMarkerEditorToolbar,
} from 'react-native-image-marker-editor';
import { createCoreEditorAdapter } from 'react-native-image-marker-editor/core-adapter';
import { ImageFormat } from 'react-native-image-marker';

const background = require('../assets/background.jpg');
const logo = require('../assets/logo.png');
const sourceSize = { width: 1920, height: 1080 };
const adapter = createCoreEditorAdapter(1024);

export function WatermarkEditor() {
  const window = useWindowDimensions();
  const width = Math.min(Math.max(window.width - 32, 280), 720);
  const height = Math.round(width * (sourceSize.height / sourceSize.width));
  const controller = React.useMemo(
    () =>
      new ImageMarkerEditorController({
        schemaVersion: 2,
        layers: [
          {
            id: 'title',
            name: 'Campaign title',
            type: 'text',
            text: 'IMAGE MARKER 2.0',
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
        output: { saveFormat: ImageFormat.png },
      }),
    []
  );
  const [resultUri, setResultUri] = React.useState<string>();

  const renderPreview = async () => {
    const result = await adapter.renderPreview({
      recipe: controller.exportRecipe(),
      input: { backgroundImage: { src: background } },
      sourceSize,
      control: { timeoutMs: 20_000 },
    });
    setResultUri(result.uri);
  };

  const exportOriginal = async () => {
    const result = await adapter.exportOriginal({
      recipe: controller.exportRecipe(),
      input: { backgroundImage: { src: background } },
      sourceSize,
      control: { timeoutMs: 20_000 },
    });
    setResultUri(result.final.uri);
  };

  return (
    <View>
      <ImageMarkerEditorToolbar controller={controller} />
      <ImageMarkerEditor
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
        sourceSize={sourceSize}
        width={width}
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

Use `adapter.renderPreview()` for a bounded interaction preview.
`adapter.exportOriginal()` returns both the visible render and the final result;
read `result.final` when optional invisible watermark or Content Credentials
processing is enabled.

## Read and persist state

The controller is the source of truth:

```tsx
const [state, setState] = React.useState(() => controller.getState());

React.useEffect(() => controller.subscribe(setState), [controller]);

const savedRecipe = controller.exportRecipe();
controller.importRecipe(savedRecipe);
```

Keep stable layer IDs when persisting recipes. Use controller methods such as
`addLayer`, `moveLayer`, `scaleLayer`, `rotateLayer`, `reorderLayer`,
`setLayerVisible`, `setLayerLocked`, `undo`, and `redo` rather than mutating a
snapshot directly.

## Coordinate and rendering contract

- Use original decoded-image pixels for numeric positions, font sizes, shadows,
  strokes, safe areas, and snapping geometry.
- Pass that original size as `sourceSize` to both `ImageMarkerEditor` and the
  render adapter.
- The Editor projects the source coordinate space into its viewport. Core
  projects the same Recipe into a bounded preview or the original export.
- Omitting `sourceSize` intentionally makes the viewport the Recipe coordinate
  space for backward compatibility.
- Browser and native renderers share the API and geometry model, but fonts,
  antialiasing, decoding, and encoding can still differ slightly.

## Examples, API, and tests

- [Native Editor example](../example/src/EditorExample.tsx)
- [Editor controller and component tests](../packages/editor/src/__tests__)
- [Browser Playground](https://image-marker.corerobin.com/playground/?workflow=editor#editor-playground)
- [Integration guide](https://image-marker.corerobin.com/guides/editor/)
- [Generated API reference](https://image-marker.corerobin.com/guides/editor/reference/)

The native example exposes stable `testID` values for add, preview, export,
canvas, toolbar, status, result, and Recipe assertions. Package tests cover the
controller, projection, surface, toolbar, Core adapter, and public API contract.
