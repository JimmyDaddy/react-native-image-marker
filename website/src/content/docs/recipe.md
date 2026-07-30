---
title: Recipe documents
description: Share one platform-neutral Recipe v2 document across Core, Editor, Node, and CLI.
---

`@image-marker/recipe@0.1` is the platform-neutral contract for the Image
Marker toolchain. It contains the Recipe v2 schema, validation, migration,
template resolution, serialization, and immutable layer operations. It has no
React, React Native, browser, or renderer dependency.

```sh
npm install @image-marker/recipe@^0.1
```

## Create and materialize a Recipe

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

The same JSON can be edited by [Editor](/guides/editor/), rendered on a device
by [Core](/guides/choose-an-api/), rendered on a server by [Node](/node/), or
processed in automation by the [CLI](/cli/).

## Stable document rules

- Set `schemaVersion: 2` for persisted documents.
- Give every layer a stable, unique `id`.
- Keep output settings under `output`.
- Use placeholders such as `{{name}}`, `{{index}}`, and `{{filename}}`.
- Validate untrusted JSON and explicitly migrate supported v1 documents.
- Persist the Recipe, not an Editor controller snapshot or renderer state.

The published JSON Schema is available as
`@image-marker/recipe/schema.json`. Core, Editor, and Node also expose the
shared Recipe types where that keeps application imports convenient.

