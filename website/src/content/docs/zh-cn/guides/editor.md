---
title: 可选交互编辑器
description: 在 Core 2 上安装并接入 react-native-image-marker-editor 0.0.1。
---

`react-native-image-marker-editor` 是独立、可选的 JS/TS 包。首个版本是
`0.0.1`，依赖 `react-native-image-marker@^2.0.0`。解码、合成、隐形水印和
最终原生编码仍由 Core 负责。

```sh
npm install react-native-image-marker@^2 \
  react-native-image-marker-editor@0.0.1
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
      position: { X: 80, Y: 60 },
    },
  ],
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

console.log(result.final.uri);
```

## 运行完整示例

[在线 Playground](/zh-cn/playground/#editor-playground) 在浏览器中直接使用真实
Editor controller 和 Core adapter，可免安装体验拖动、缩放、旋转、排序、锁定、
undo/redo 与 Core 渲染。

原生端可运行仓库中的
[React Native example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)，
选择 **Editor 0.0.1**。该页面会渲染 `ImageMarkerEditor` 与
`ImageMarkerEditorToolbar`，并验证预览和原分辨率 Core 导出。

## 0.0.1 范围

- 图片和文字图层，以及选择、拖动、双指缩放、旋转和排序。
- 显隐与锁定；锁定图层不能修改、删除或排序。
- 对齐线、吸附和安全区域。
- 分组 undo/redo 与 Recipe v2 导入导出。
- 低分辨率交互预览和原分辨率最终导出。
- 键盘操作与基础无障碍标签/角色。
- 可见、隐形水印和可选 C2PA 导出选项。
- 按需引入 Core adapter，主入口不强制带入较重 renderer。

视频、通用滤镜、云端协作以及重复的原生编码逻辑不进入 `0.0.1`。

## 状态与持久化

Controller 是唯一状态源。订阅其 snapshot，保留稳定 Recipe 图层 ID，并持久化
`controller.exportRecipe()`。导入 v1 Recipe 时会先经过 Core 迁移边界，再由
Controller 保存 v2 文档。

如果预览或最终渲染在服务端完成，可注入自定义 adapter。默认 Core adapter 会
继续转发任务取消、超时和进度参数。
