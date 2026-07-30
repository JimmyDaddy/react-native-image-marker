---
title: 可选交互编辑器
description: 使用 react-native-image-marker-editor 0.3 与 Core 2.1 构建可视化 Recipe v2 工作区。
---

`react-native-image-marker-editor@0.3` 是可选的 React Native 与 Web 交互包，
负责 Recipe 状态、选择、手势、历史、面板、模板与持久化；Core 2.1 负责图片
检查、预览渲染、合成与编码。

```sh
npm install react-native-image-marker@^2.1 \
  react-native-image-marker-editor@^0.3
```

## 完整工作区

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
      name: '活动标题',
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

同时传入 `source` 与 Core adapter 后，Core 2.1 会自动读取解码尺寸与编码方向，
数值坐标始终使用原图像素。只有自定义 renderer 需要覆盖检测结果时才传
`sourceSize`。

## 预览与导出

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

受限尺寸预览与原图导出共用相同 Recipe 坐标空间，因此文字、图片、缩放与位置
会保持一致。

## Editor 0.3 能力

- Toolbar、Inspector、Layer Panel 与可复用 Asset Panel。
- 文字排版、颜色、透明度、描边与混合模式编辑。
- 图片新增/替换、品牌颜色、字体、资产与 Logo preset。
- 多选、复制、分组、解组、对齐、分布、copy 与 paste。
- 拖动、双指缩放、resize/rotate handle、zoom、pan、fit、安全区与吸附。
- 重命名、锁定、显隐、删除、层级、键盘快捷键、undo 与 redo。
- 可选 autosave、受控状态、模板、占位符、条件、自定义 slots 与插件。

Controller 操作是原子且可撤销的：

```ts
controller.selectLayers(['title', 'logo']);
controller.groupLayers();
controller.alignLayers('center', measuredBounds);
controller.distributeLayers('horizontal', measuredBounds);

const portableClipboard = controller.copyLayers();
otherController.pasteLayers(portableClipboard);
```

## 示例、测试与 API

[在线 Playground](/zh-cn/playground/?workflow=editor#editor-playground) 使用真实
Editor controller 与 Core adapter，把结果作为与画布并列的 tab 展示，同时提供
集成代码和实时 Recipe。

仓库还提供
[完整原生组件指南](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/docs/editor.md)、
[React Native example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)、
单元测试与原生 Editor E2E 覆盖。

可在 [Editor API 参考](/zh-cn/guides/editor/reference/)中查询 controller 方法、
组件 props、adapter、模板、持久化、安全区、吸附与插件类型。

## 渲染边界

Editor 主入口不会强制把图片 renderer 带入 bundle。需要端内渲染时导入显式的
`/core-adapter` 子路径；预览与导出由服务端完成时，可注入由
[`@image-marker/node`](/zh-cn/node/) 支持的
`ImageMarkerEditorRenderAdapter`。视频、通用滤镜、云资产管理与云协作不属于
Editor 0.3。
