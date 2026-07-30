---
title: Recipe 文档
description: 让 Core、Editor、Node 与 CLI 共用同一份平台中立 Recipe v2 文档。
---

`@image-marker/recipe@0.1` 是 Image Marker 工具链的平台中立契约，提供
Recipe v2 schema、验证、迁移、模板解析、序列化和不可变图层操作，不依赖
React、React Native、浏览器或任何渲染器。

```sh
npm install @image-marker/recipe@^0.1
```

## 创建并解析 Recipe

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

同一份 JSON 可以由 [Editor](/zh-cn/guides/editor/) 编辑，在客户端通过
[Core](/zh-cn/guides/choose-an-api/) 渲染，在服务端通过 [Node](/zh-cn/node/)
渲染，或交给 [CLI](/zh-cn/cli/) 自动处理。

## 稳定文档约定

- 持久化文档应设置 `schemaVersion: 2`。
- 每个图层都使用稳定且唯一的 `id`。
- 输出设置统一放在 `output` 下。
- 可使用 `{{name}}`、`{{index}}`、`{{filename}}` 等占位符。
- 对外部 JSON 先验证，对受支持的 v1 文档执行显式迁移。
- 持久化 Recipe，而不是 Editor controller snapshot 或渲染器内部状态。

发布包通过 `@image-marker/recipe/schema.json` 提供 JSON Schema。Core、
Editor 与 Node 也会在适合的入口复用这些共享类型。

