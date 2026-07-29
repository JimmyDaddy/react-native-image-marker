# react-native-image-marker-editor

Optional interactive Recipe v2 editor for `react-native-image-marker@2`.

```sh
npm install react-native-image-marker@^2 \
  react-native-image-marker-editor@0.1.0
```

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
  layers: [{ id: 'title', type: 'text', text: 'Draft' }],
  output: { saveFormat: ImageFormat.png },
});
const adapter = createCoreEditorAdapter(1024);
const sourceSize = { width: 1920, height: 1080 };

<ImageMarkerEditor
  controller={controller}
  sourceSize={sourceSize}
  width={360}
  height={240}
/>;
<ImageMarkerEditorToolbar controller={controller} />;

const recipe = controller.exportRecipe();
const result = await adapter.exportOriginal({
  recipe,
  input: { backgroundImage: { src: imageSource } },
  sourceSize,
});
```

Use original-image pixels for numeric Recipe positions and sizes, then pass
the same `sourceSize` to the surface and render adapter. The Editor projects
that source coordinate space into its viewport, and the Core adapter projects
it into bounded previews. Omit `sourceSize` only when the viewport itself is
the intended Recipe coordinate space.

The main entry owns only UI and Recipe state. Import the opt-in `core-adapter`
entry to render previews or final output through Core, or inject your own
adapter for a server renderer.

Run the repository's React Native example and choose **Editor 0.1.0**, or use
the [browser playground](https://image-marker.corerobin.com/playground/?workflow=editor#editor-playground)
to exercise drag, scale, rotation, ordering, locks, undo/redo, and a real Core
render.

Read the
[complete repository usage guide](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/docs/editor.md),
the [integration guide](https://image-marker.corerobin.com/guides/editor/), or browse the
[generated API reference](https://image-marker.corerobin.com/guides/editor/reference/)
for controller methods, component props, adapters, state, and export types.

## Migrating from 0.0.x

`0.1.0` does not remove or rename any `0.0.3` API. Existing integrations can
upgrade the package version without changing application code.

- Keep passing the original decoded image dimensions as `sourceSize` to both
  `ImageMarkerEditor` and the Core adapter for preview/export parity.
- Custom `renderLayer` implementations continue to receive source dimensions,
  viewport dimensions, and the projection scale.
- The Core adapter remains opt-in through
  `react-native-image-marker-editor/core-adapter`.
- Optional `testID` props now expose stable canvas, layer, toolbar, and action
  identifiers for native E2E or application component tests.

The checked `api-contract.json` file records the supported main-entry and
subpath exports so accidental public API drift fails CI.
