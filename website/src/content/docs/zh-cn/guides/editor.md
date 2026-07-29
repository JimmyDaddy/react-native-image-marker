---
title: 可选交互编辑器
description: 在 Core 2 上安装并接入 react-native-image-marker-editor 0.1.0。
---

`react-native-image-marker-editor` 是独立、可选的 JS/TS 包。首个版本是
`0.0.1`，当前稳定化版本为 `0.1.0`，依赖
`react-native-image-marker@^2.0.0`。解码、合成、隐形水印和
最终原生编码仍由 Core 负责。

```sh
npm install react-native-image-marker@^2 \
  react-native-image-marker-editor@0.1.0
```

## 创建编辑器

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
  layers: [
    {
      id: 'title',
      name: '标题',
      type: 'text',
      text: '草稿',
      position: { X: 320, Y: 180 },
    },
  ],
  output: { saveFormat: ImageFormat.png },
});
const adapter = createCoreEditorAdapter(1024);
const sourceSize = { width: 1920, height: 1080 };

<ImageMarkerEditor
  controller={controller}
  sourceSize={sourceSize}
  width={360}
  height={203}
/>;
<ImageMarkerEditorToolbar controller={controller} />;

const recipe = controller.exportRecipe();
const result = await adapter.exportOriginal({
  recipe,
  input: { backgroundImage: { src: imageSource } },
  sourceSize,
});

console.log(result.final.uri);
```

## 保持画布与 Core 渲染一致

Recipe 的数值坐标使用原图像素。图片解码后读取一次尺寸，并将同一个
`sourceSize` 同时传给 `ImageMarkerEditor` 和 Core adapter 请求。交互画布会将
原图等比投影到 viewport；受限尺寸预览则会一起缩放位置、字体、阴影、描边、
文字背景、平铺参数和图片图层。

省略 `sourceSize` 时，Editor 0.1.0 会保留旧行为：直接把 viewport 当作 Recipe
坐标空间。这适合只面向固定 viewport 的 Recipe，但不适合需要原分辨率
WYSIWYG 导出的场景。

## 运行完整示例

[在线 Playground](/zh-cn/playground/?workflow=editor#editor-playground) 在浏览器中直接使用真实
Editor controller 和 Core adapter，可免安装体验拖动、缩放、旋转、排序、锁定、
undo/redo 与 Core 渲染。

原生端可运行仓库中的
[React Native example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)，
选择 **Editor 0.1.0**。该页面会渲染 `ImageMarkerEditor` 与
`ImageMarkerEditorToolbar`，并验证预览和原分辨率 Core 导出。

仓库还提供一份可与示例源码配套阅读的
[完整组件与坐标指南](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/docs/editor.md)。

## 从 0.0.x 迁移

`0.1.0` 与 `0.0.3` 保持向后兼容，没有移除或重命名公共导出。继续给交互画布
和 adapter 请求传入同一个 `sourceSize`，并从独立的 `/core-adapter` 子路径导入
Core adapter 即可。新增的可选 `testID` props 会为画布、图层、工具栏及其操作
暴露稳定的原生测试标识。

包内现在会在 CI 中校验公共运行时/类型导出列表和 peer dependency 范围，因此
公共 API 变化必须显式更新契约，不会意外混入补丁版本。

## 0.1.x 范围

- 图片和文字图层，以及选择、拖动、双指缩放、旋转和排序。
- 显隐与锁定；锁定图层不能修改、删除或排序。
- 对齐线、吸附和安全区域。
- 分组 undo/redo 与 Recipe v2 导入导出。
- 低分辨率交互预览和原分辨率最终导出。
- 键盘操作与基础无障碍标签/角色。
- 可见、隐形水印和可选 C2PA 导出选项。
- 按需引入 Core adapter，主入口不强制带入较重 renderer。

视频、通用滤镜、云端协作以及重复的原生编码逻辑不进入 `0.1.x`。

## API 参考

可先阅读中文 [Editor API 导航](/zh-cn/guides/editor/reference/)，再进入自动生成的
[详细参考](/guides/editor/reference/)查询
`ImageMarkerEditorController`、组件 props、render adapter、状态、安全区域与
吸附类型、导出选项以及 `createCoreEditorAdapter`。

## 状态与持久化

Controller 是唯一状态源。订阅其 snapshot，保留稳定 Recipe 图层 ID，并持久化
`controller.exportRecipe()`。导入 v1 Recipe 时会先经过 Core 迁移边界，再由
Controller 保存 v2 文档。

如果预览或最终渲染在服务端完成，可注入自定义 adapter。默认 Core adapter 会
继续转发任务取消、超时和进度参数。
