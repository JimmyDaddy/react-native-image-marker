---
title: 独立 Web SDK
description: 在不安装 React Native 的浏览器、Vite 应用或 WebView 中使用 Image Marker。
---

`@image-marker/web@0.1.0` 面向不安装 React Native、也不运行 Node sidecar 的
应用。它使用现有 Canvas 2D renderer，并在一个包中提供 Core、Recipe、隐形
水印和 headless 编辑器的公开契约。

```sh
npm install @image-marker/web@0.1.0
```

## 处理本地文件

Web SDK 支持 `File`、`Blob`、data URL、URL 字符串和已加载的浏览器图像。桌面
WebView 推荐优先传本地文件，让宿主自行管理文件授权和保存策略。

```ts
import Marker, { ImageFormat, Position } from '@image-marker/web';

const file = input.files?.[0];
if (!file) throw new Error('请选择图片。');

const result = await Marker.markText({
  backgroundImage: { src: file },
  watermarkTexts: [
    {
      text: 'IMAGE MARKER',
      position: { position: Position.bottomRight, X: 24, Y: 24 },
      style: { color: '#FFFFFF', fontSize: 28, bold: true },
    },
  ],
  saveFormat: ImageFormat.png,
});

preview.src = result.uri;
```

Web 输出是 data URL。若需要内存中的 `Blob`，创建 `{ resultType: 'blob' }` 的
Recipe，并在预览替换时释放 object URL：

```ts
const recipe = Marker.createRecipe(
  {
    schemaVersion: 2,
    layers: [
      {
        id: 'caption',
        type: 'text',
        text: '© {{filename}}',
        style: { color: '#FFFFFF', fontSize: 24 },
        position: { position: Position.bottomLeft, X: 20, Y: 20 },
      },
    ],
    output: { saveFormat: ImageFormat.jpg, quality: 92 },
  },
  { resultType: 'blob' }
);
const blob = await recipe.apply({
  backgroundImage: { src: file },
  filename: file.name,
});
const url = URL.createObjectURL(blob);
preview.src = url;
// 替换预览时调用 URL.revokeObjectURL(url)。
```

`applyMany()` 保持输入顺序并分别报告每个结果。传入 `AbortSignal` 可停止排队
任务和支持协作取消的阶段。需要实例级取消边界时，应从 `marker` 实例创建
Recipe：

```ts
import { createWebMarker } from '@image-marker/web';

const marker = createWebMarker();
const recipe = marker.createRecipe(recipeDocument, { resultType: 'blob' });
const controller = new AbortController();
const pending = recipe.apply(
  { backgroundImage: { src: file } },
  { signal: controller.signal }
);
const completion = pending.catch(() => undefined);
controller.abort();
await marker.cancel(); // 等待任务结束及已配置宿主的终止确认
await completion;
await marker.dispose();
```

已经开始的同步 Canvas 工作可能在观察信号前完成。Promise 超时或忽略结果都不
会停止计算；若宿主要求立即停止 CPU 工作，应终止宿主自己创建的 Worker 或任务，
并丢弃迟到结果。

对于 Tauri 或其他隔离宿主，可通过 `createWebMarker({ resources, execution })`
创建实例。资源适配器负责 `createImage`、`createCanvas`、object URL 清理和字节
读取；执行适配器的 `start({ taskId, operation, resultKind, options, signal })`
返回真实任务 Promise，并可提供 `terminate`/`cancel` 与 `dispose`。实例的
`marker.cancel()` 和 `marker.dispose()` 会等待宿主确认，`marker.capabilities`
会报告需要宿主终止的操作。

## 公开入口

| 入口 | 用途 |
| --- | --- |
| `@image-marker/web` | `Marker`、枚举、Recipe helpers、可见与隐形水印 API |
| `@image-marker/web/headless` | `ImageMarkerEditorController`、图层操作、几何、投影、预设和类型 |
| `@image-marker/web/editor-adapter` | `createWebEditorAdapter(previewMaxSize?)` 与 `resolveWebEditorSourceInfo` |
| `@image-marker/web/worker` | 随包提供的隐形水印检测 Worker |

Headless editor 负责 Recipe 状态、选择和 undo/redo；Web adapter 将其连接到
Canvas 预览和原图导出，不会导入 React Native 编辑器 UI：

```ts
import { ImageMarkerEditorController } from '@image-marker/web/headless';
import { createWebEditorAdapter } from '@image-marker/web/editor-adapter';

const controller = new ImageMarkerEditorController({
  document: {
    schemaVersion: 2,
    layers: [{ id: 'title', type: 'text', text: 'Draft' }],
    output: { saveFormat: 'png' },
  },
});
const adapter = createWebEditorAdapter(1024);
const request = {
  recipe: controller.exportRecipe(),
  input: { backgroundImage: { src: file } },
};
const preview = await adapter.renderPreview(request);
const exported = await adapter.exportOriginal(request);
```

实例 API 是可选的边界。默认静态 `Marker` 继续使用现有 DOM Canvas 行为；注入
执行适配器后，完整操作可以交给宿主拥有的 Tauri 任务。宿主必须等任务真实完成
或停止后再 settle，并丢弃迟到结果。

## 隐形水印与 Worker 资源

使用 1–12 个 UTF-8 字节的短 locator，并把密钥放在浏览器源码之外。Worker 只
负责隐形水印检测，整个 Canvas 图片引擎不能直接搬进普通 Worker。

Vite 可以解析随包提供的资源，不需要 CDN：

```ts
import workerUrl from '@image-marker/web/worker?url';

const detection = await Marker.detectInvisible({
  image: { src: file },
  key: await loadKeyFromTrustedStorage(),
  search: 'robust',
  worker: { scriptUrl: workerUrl },
});
```

旧官网 URL `/worker/invisible-watermark.js` 继续保留；官网构建会从已构建 Web
包的公开导出复制该文件。消费者也可以使用相同的包资源或 bundler URL 导入，
不要导入仓库源码路径。

## URL、CORS 与 C2PA

远端 URL 仍然可用，但图片服务器必须允许 CORS，宿主 CSP 也要允许所需的图片和
Worker 来源。SDK 不会全局禁用远端 URL。在受限浏览器中，元信息读取优先使用已
提供的文件字节或解码后的图像，不依赖 `fetch(dataURL)` 绕过 CSP。

C2PA 是可选集成边界。只有需要读取或签名 manifest 时才安装并加载 C2PA 库；Web
SDK 不会为所有消费者引入它。签名和密钥保管由应用或服务决定。

本浏览器包没有宣称已通过 Tauri 2 的 macOS、Windows、Linux 验收。下游 Tauri
应用仍需自行验证 WebView Canvas、文件授权、Worker 生命周期和宿主终止策略。
可参考[最小 Vite 消费示例](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/examples/web-sdk)
与 [Web SDK README](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/packages/web)。
