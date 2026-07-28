---
title: 从 v1 迁移到 v2
description: React Native Image Marker 2 的完整 breaking-change 清单与可运行迁移示例。
---

import { Aside } from '@astrojs/starlight/components';

Core 2 主动调整了返回结果、Recipe、错误、任务控制和原生类型边界。
现有 v1 应用仍由独立的 `release/1.x` 线路维护；可以在准备好采用新契约后再升级。

```sh
# 继续使用受维护的 v1
npm install react-native-image-marker@1

# 将当前应用升级到 Core 2
npm install react-native-image-marker@2
npx pod-install
```

<Aside type="caution" title="需要重新构建原生应用">
  Core 2 修改了生成的 TurboModule 契约和原生取消入口。切换主版本后应清理旧的
  原生产物、重新安装 Pods，并重新构建 iOS 和 Android。
</Aside>

## Breaking change 清单

| v1 行为 | Core 2 行为 | 迁移动作 |
| --- | --- | --- |
| 可见渲染和隐形嵌入方法返回 URI 字符串 | 方法返回 `MarkerResult` | 使用 `result.uri`，并按需使用任务、格式、耗时和元数据字段 |
| Recipe v1 使用 `watermarks` 和顶层输出选项 | Recipe v2 使用稳定的 `layers` 与嵌套 `output` | 调用 `migrateWatermarkRecipe(v1Document)` 或重写文档 |
| 接受 `positionOptions`、`watermarkImage`、`watermarkPositions` | 删除这些旧别名 | 使用 `position`、`watermarkImages` 或有序 `watermarks` |
| 原生失败是非结构化消息 | `ImageMarkerError` 包含 `code`、`jobId`、`operation` | 按稳定错误码判断，不再解析字符串 |
| 单次任务无法主动控制 | 单任务接受 `signal`、`timeoutMs`、`onProgress` | 给渲染、嵌入、检测或 Recipe `apply` 传第二个参数 |
| Recipe 图层没有稳定编辑器标识 | 图层拥有稳定 `id`，以及 `name`、`visible`、`locked`、`visibleWhen` | 保存、修改和编辑时保持图层 ID |
| 输出元数据策略隐式 | 像素方向会归一化，来源 EXIF/GPS 默认剥离 | 将 `result.metadata.policy === 'strip'` 视为 v2 隐私基线 |
| TurboModule 传递宽松对象 | TS、Android、iOS 使用完整生成类型 | 重新运行 codegen；自定义原生 fork 需同步签名 |
| 仅 JPEG/PNG/base64 | Android 和 Web 支持 WebP；iOS 明确拒绝 | 按平台判断，或用 JPEG/PNG 获得跨平台输出 |

`Marker.detectInvisible()` 原本就返回结构化检测结果，因此不会再包一层
`MarkerResult`；置信度、payload、误码率和可选缩放结果仍可直接读取。

## 1. 改为读取 `result.uri`

```diff
-const path = await Marker.markText(options);
-await shareFile(path);
+const result = await Marker.markText(options);
+await shareFile(result.uri);
+console.log(result.jobId, result.durationMs, result.format);
```

同样适用于 `markImage`、`mark`、`embedInvisible`、Recipe 返回值，以及
对应 `*Many` 方法中状态为 fulfilled 的值。

```diff
 const paths = batch.flatMap((item) =>
-  item.status === 'fulfilled' ? [item.value] : []
+  item.status === 'fulfilled' ? [item.value.uri] : []
 );
```

## 2. 把 Recipe v1 升级为 v2

```diff
 const definition = {
-  schemaVersion: 1,
-  watermarks: [
+  schemaVersion: 2,
+  layers: [
     {
+      id: 'copyright',
       type: 'text',
       text: '© {{studio}}',
     },
   ],
-  saveFormat: ImageFormat.jpg,
-  quality: 90,
+  output: {
+    saveFormat: ImageFormat.jpg,
+    quality: 90,
+  },
 };
```

对已经持久化的 v1 JSON，先显式迁移，再保存返回的 v2 文档：

```ts
import Marker, { migrateWatermarkRecipe } from 'react-native-image-marker';

const v2Document = migrateWatermarkRecipe(JSON.parse(savedRecipe));
const recipe = Marker.createRecipe(v2Document);
await saveRecipe(JSON.stringify(recipe.toJSON()));
```

`createRecipe()` 有意只接受 v2 输入，避免旧文档静默保留含糊的输出或图层语义。

## 3. 删除旧别名

```diff
 watermarkTexts: [{
   text: 'Demo',
-  positionOptions: { position: Position.center },
+  position: { position: Position.center },
 }]
```

```diff
-watermarkImage: { src: logo },
-watermarkPositions: { position: Position.topRight },
+watermarkImages: [{
+  src: logo,
+  position: { position: Position.topRight },
+}],
```

直接调用 `Marker.mark()` 时仍使用有序 `watermarks` 数组。改成 `layers`
只针对 Recipe v2 文档，这些图层还会携带稳定的编辑器 ID。

## 4. 使用任务控制与结构化错误

```ts
import Marker, { ImageMarkerError } from 'react-native-image-marker';

const controller = new AbortController();

try {
  const result = await Marker.mark(options, {
    signal: controller.signal,
    timeoutMs: 15_000,
    onProgress: ({ jobId, phase, progress }) => {
      console.log(jobId, phase, progress);
    },
  });
  return result.uri;
} catch (error) {
  if (error instanceof ImageMarkerError && error.code === 'ABORTED') return;
  throw error;
}
```

取消和超时是幂等的；原生侧会释放活动任务资源，再次调用 `abort()` 不会把已完成
任务改成失败。批量并发上限仍是 Web 4、原生 1，避免解码内存无限增长。

## 5. 字体、格式和元数据策略

- 主字体不一定包含全部字形时，在 `fontName` 后配置 `fontFallbacks`。
- 透明或锐利线条优先 PNG，照片优先 JPEG；WebP 需先确认平台支持。
- 来源方向会先应用到像素，再执行渲染。
- Core 2 默认剥离来源 EXIF/GPS 等元数据。需要签名来源时使用 Content
  Credentials adapter，而不是复制可能过期的来源声明。

## 发布前验证

1. 搜索代码和保存文档中的旧别名及 `schemaVersion: 1`。
2. 对所有渲染和嵌入结果的消费点运行类型检查。
3. 在两个原生平台分别验证取消、超时和至少一个预期错误。
4. 在 iOS、Android、Web 对比字体 fallback、旋转、透明、JPEG matte 和方向。
5. 使用真实打包产物在全新消费项目安装，不要只依赖 monorepo 链接。

原始 [v1 文档](/v1/)和不可变的
[v1.0.0 归档](/versions/1.0.0/)会在 v1 LTS 窗口内及结束后持续保留。
