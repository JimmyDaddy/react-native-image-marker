# @image-marker/recipe

Platform-neutral Recipe v2 schema, validation, migration, template resolution,
serialization, and immutable layer operations for the Image Marker toolchain.
It does not depend on React, React Native, a browser, or an image renderer.

```sh
npm install @image-marker/recipe
```

```ts
import {
  createWatermarkRecipeDefinition,
  materializeWatermarkRecipe,
  serializeWatermarkRecipe,
} from '@image-marker/recipe';

const recipe = createWatermarkRecipeDefinition({
  layers: [
    {
      id: 'recipient',
      type: 'text',
      text: 'Prepared for {{name}}',
      style: { fontSize: 32, color: '#FFFFFF' },
    },
  ],
  output: { saveFormat: 'png' },
});

const resolved = materializeWatermarkRecipe(recipe, {
  variables: { name: 'Alice' },
});

const json = serializeWatermarkRecipe(resolved);
```

The published JSON Schema is available through
`@image-marker/recipe/schema.json`. Core, Editor, Node, and CLI packages consume
the same document contract while keeping rendering and platform dependencies in
their own packages.
