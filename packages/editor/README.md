# react-native-image-marker-editor

Optional interactive Recipe v2 editor for `react-native-image-marker@2`.

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

<ImageMarkerEditor controller={controller} width={360} height={240} />;
<ImageMarkerEditorToolbar controller={controller} />;

const recipe = controller.exportRecipe();
const result = await adapter.exportOriginal({
  recipe,
  input: { backgroundImage: { src: imageSource } },
});
```

The main entry owns only UI and Recipe state. Import the opt-in `core-adapter`
entry to render previews or final output through Core, or inject your own
adapter for a server renderer.

Run the repository's React Native example and choose **Editor 0.0.2**, or use
the [browser playground](https://image-marker.corerobin.com/playground/?workflow=editor#editor-playground)
to exercise drag, scale, rotation, ordering, locks, undo/redo, and a real Core
render.

Read the [integration guide](https://image-marker.corerobin.com/guides/editor/)
or browse the
[generated API reference](https://image-marker.corerobin.com/guides/editor/reference/)
for controller methods, component props, adapters, state, and export types.
