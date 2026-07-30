---
title: Node 渲染器
description: 在不依赖 React Native 的 Node.js 服务中渲染 Recipe v2 图片。
---

`@image-marker/node@0.1` 是由 Sharp 驱动的纯 Node.js 渲染器，不依赖 React
或 React Native。它支持文件路径、Buffer、Uint8Array 与 Readable Stream
输入，可返回 Buffer、写入文件或生成输出流。

```sh
npm install @image-marker/node@^0.1 sharp@^0.35
```

## 在服务端渲染

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { renderNodeImage } from '@image-marker/node';

const background = await readFile('photo.jpg');
const result = await renderNodeImage(
  {
    schemaVersion: 2,
    layers: [
      {
        id: 'title',
        type: 'text',
        text: 'Prepared for {{recipient}}',
        position: { position: 'topLeft', edgeInset: 32 },
        style: { color: '#FFFFFF', fontSize: 48, maxWidth: '60%' },
      },
    ],
    output: { saveFormat: 'webp', quality: 86, maxSize: 2048 },
  },
  {
    backgroundImage: { src: background },
    variables: { recipient: 'Alice' },
  }
);

await writeFile('marked.webp', result.data);
```

文件工作流可使用 `renderNodeImageToFile()`，HTTP 响应可使用
`renderNodeImageToStream()`。`createNodeImageMarker()` 可注入 Sharp，并设置
进程级并发上限。

## 批处理与检查

`marker.renderMany()` 会保持输入顺序，并支持并发上限、重试、进度和
`AbortSignal` 取消。`inspectNodeImage()` 返回编码/显示尺寸、格式、EXIF
方向、alpha、通道与 density。

包内还提供无损 PNG 认证 locator：
`embedNodeInvisibleLocator()` 与 `detectNodeInvisibleLocator()`。密钥应存入
secret manager；JPEG 转换、缩放或破坏性优化可能移除 locator。

Shell 与 CI 自动化请使用 [Image Marker CLI](/zh-cn/cli/)；移动端与浏览器
渲染请使用 [Core](/zh-cn/getting-started/)。

