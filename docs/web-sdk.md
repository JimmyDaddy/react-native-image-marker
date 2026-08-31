# `@image-marker/web` Web SDK

`@image-marker/web@0.1.0` 是不依赖 React Native、Node 原生模块或 sidecar 的
浏览器 SDK。它复用 Image Marker 的 Web Canvas 实现，提供文字、Logo、Recipe
和隐形 locator 的写入与检测；同一份 Recipe JSON 也可以交给 Node 或 CLI
处理。

## 安装与入口

```sh
npm install @image-marker/web@0.1.0
```

公开入口如下：

- `@image-marker/web`：Web `Marker` 默认导出、`Position`、`ImageFormat`、Recipe
  操作、可见/隐形水印 API 以及公共类型。
- `@image-marker/web/headless`：不包含 React UI 的
  `ImageMarkerEditorController`、图层操作、几何、投影、预设和类型。
- `@image-marker/web/editor-adapter`：`createWebEditorAdapter` 和
  `resolveWebEditorSourceInfo`，用于把 headless controller 连接到 Canvas
  预览与原图导出。
- `@image-marker/web/worker` 或
  `@image-marker/web/worker/invisible-watermark.js`：随包分发的隐形水印检测
  Worker 文件。

Vite 项目可以让构建工具解析 Worker URL：

```ts
import workerUrl from '@image-marker/web/worker?url';
```

需要复制到站点静态目录时，也应通过公开入口解析资源，不依赖包内目录布局。
以下代码只在构建时运行，不会成为浏览器运行时依赖：

```js
import { createRequire } from 'node:module';
import { copyFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
copyFileSync(
  require.resolve('@image-marker/web/worker'),
  './public/invisible-watermark.js'
);
```

## 最小渲染

浏览器端正式支持 `File`、`Blob`、data URL、URL 字符串和已加载的浏览器
`HTMLImageElement`。下面的例子从本地文件读取并返回 Web data URL：

```ts
import Marker, { ImageFormat, Position } from '@image-marker/web';

const file = input.files?.[0];
if (!file) throw new Error('请选择图片');

const result = await Marker.markText({
  backgroundImage: { src: file },
  watermarkTexts: [
    {
      text: '仅供预览',
      position: { position: Position.bottomRight, X: 24, Y: 24 },
      style: { color: '#FFFFFF', fontSize: 28, bold: true },
    },
  ],
  saveFormat: ImageFormat.png,
});

preview.src = result.uri;
```

`result.uri` 在 Web 上是 data URL，可以直接赋给 `<img>` 或下载链接。需要
避免持有 data URL 时，也可以使用 Recipe 的 Blob 结果：

```ts
const recipe = Marker.createRecipe(
  {
    schemaVersion: 2,
    layers: [
      {
        id: 'label',
        type: 'text',
        text: '© {{filename}}',
        position: { position: Position.bottomLeft, X: 20, Y: 20 },
        style: { color: '#FFFFFF', fontSize: 24 },
      },
    ],
    output: { saveFormat: ImageFormat.jpg, quality: 92 },
  },
  { resultType: 'blob' }
);

const output = await recipe.apply({
  backgroundImage: { src: file },
  filename: file.name,
});
const objectUrl = URL.createObjectURL(output);
preview.src = objectUrl;
// 在替换或移除预览时调用 URL.revokeObjectURL(objectUrl)。
```

`applyMany()` 接受多个 `File` 或 `Blob`，按输入顺序返回每一项的
`fulfilled`、`rejected` 或 `aborted` 状态。不要把 object URL 当成永久文件名，
应由界面在不再使用时回收它。

## 编辑器的无 UI用法

需要自定义 Canvas、React 或 Tauri 前端时，只引入 headless controller 和 Web
适配器：

```ts
import { ImageMarkerEditorController } from '@image-marker/web/headless';
import { createWebEditorAdapter } from '@image-marker/web/editor-adapter';

const controller = new ImageMarkerEditorController({
  document: {
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        type: 'text',
        text: 'Draft',
        position: { X: 80, Y: 64 },
        style: { color: '#FFFFFF', fontSize: 52, bold: true },
      },
    ],
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

`renderPreview` 使用受限尺寸，`exportOriginal` 使用 Recipe 的原图坐标和输出
设置。若 UI 需要将指针坐标映射到原图，使用 `/headless` 的 projection helpers；
不要在消费端复制坐标换算逻辑。`controller.subscribe()` 返回取消订阅函数，
组件销毁时应调用它和 `controller.dispose()`。

## 取消、Worker 与资源边界

可协作取消的 Recipe 阶段接受 `AbortSignal`，例如批处理的排队任务和隐形水印
检测。需要实例级取消边界时，Recipe 应从 `createWebMarker()` 实例创建：

```ts
import { createWebMarker } from '@image-marker/web';

const marker = createWebMarker();
const recipe = marker.createRecipe(recipeDocument, { resultType: 'blob' });
const abort = new AbortController();
const pending = recipe.apply(
  { backgroundImage: { src: file } },
  { signal: abort.signal }
);
const completion = pending.catch(() => undefined);
abort.abort();
await marker.cancel(); // 等待任务结束及已配置宿主的终止确认
await completion;
await marker.dispose();
```

在检测 API 上传入 Worker URL 后，像素检测在专用 Worker 中执行：

```ts
const detection = await Marker.detectInvisible({
  image: { src: file },
  key: await loadKeyFromTrustedStorage(),
  search: 'robust',
  worker: { scriptUrl: workerUrl, signal: abort.signal },
});
```

Worker 只承载隐形水印检测协议，不能把整个 Canvas 图片引擎当作普通 Worker
运行时。同步 Canvas 编码已经开始后，`AbortSignal` 只能阻止后续协作阶段；若
宿主必须立即停止 CPU 工作，应由宿主终止自己创建的 Worker 或任务进程，并在
宿主侧丢弃迟到结果。Promise 超时和忽略结果不等于停止计算。

每个检测请求都应使用自己的 Worker/AbortController 边界；销毁页面、任务或
组件时解除监听、终止宿主创建的 Worker，并释放 object URL。SDK 不会替调用方
保存本地文件，也不会为了读取本地字节而自动放开远端联网。

需要把完整图片操作交给 Tauri 隔离执行单元时，可用 `createWebMarker()` 创建
实例，并注入 `resources` 与 `execution` 适配器。执行适配器的 `start()` 返回
真实任务的 `result`，以及可选的 `terminate()`/`cancel()` 和 `dispose()`；
实例 `cancel()` 与 `dispose()` 会等待宿主确认后再结束任务。`capabilities` 会
区分默认 DOM Canvas 的宿主终止要求与 Worker 检测的协作取消能力：

```ts
import { createWebMarker } from '@image-marker/web';

const marker = createWebMarker({
  resources: hostResources,
  execution: {
    start(request) {
      return hostTaskForTauri(request);
    },
  },
});

console.log(marker.capabilities);
await marker.cancel();
await marker.dispose();
```

宿主适配器必须让 `result` 在任务真实完成或停止后才 settle，并处理迟到结果；
不得用 `Promise.race` 超时伪造停止。默认导出的静态 `Marker` 仍保持现有 DOM
行为，实例 API 只在需要资源或执行边界时使用。

执行请求不是可直接序列化的 IPC DTO。宿主需要把图片资源映射成自己的文件句柄
或字节协议，单独转发取消信号，并在本地保留观察回调；`AbortSignal`、已加载的
DOM 图片和函数不能直接跨 Rust IPC 传输。

## URL、CORS 与本地素材

本地 `File`/`Blob` 是桌面应用推荐的输入。调用方可以用 Rust 或文件选择窗口
管理授权，再把 Blob 交给 Web SDK；SDK 不会全局禁止已有的 URL 输入。使用远端
URL 时，图片服务器必须允许 CORS，且 CSP、`img-src` 和 `connect-src` 需要由
宿主应用配置。浏览器受限环境中不要依赖 `fetch(dataURL)` 读取元信息；SDK 会
优先从已给出的文件字节或浏览器图像读取尺寸和方向。

## 隐形 locator 与 C2PA

隐形水印 payload 只适合短 locator（1–12 个 UTF-8 字节），密钥至少 16 个
UTF-8 字节；不要把个人信息或生产主密钥硬编码在浏览器 bundle。检测成功表示
帧通过算法、CRC 与认证校验，不表示图像未被修改。

C2PA 是按需的独立能力：本包只提供与现有 manifest/签名适配器衔接的类型和
边界，不强制所有消费者安装 C2PA 或 ZIP 依赖。签名、密钥保管、manifest
策略由应用或独立服务决定。

本包没有宣称已通过 Tauri 2 的 macOS、Windows、Linux 三个平台验收。Tauri
应用仍需自行验证 WebView 的 Canvas、文件授权、Worker 生命周期和宿主强制终止
行为；这些验证不能由浏览器示例替代。

最小可运行项目见 [`examples/web-sdk`](../examples/web-sdk/)，在线示例见官网
[Web SDK 指南](https://image-marker.corerobin.com/guides/web-sdk/)。
