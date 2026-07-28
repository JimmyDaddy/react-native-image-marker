---
title: 性能与任务控制
description: 限制解码内存、控制并发、观察进度、取消任务，并理解 Core 2 参考基准。
---

import { Aside } from '@astrojs/starlight/components';

图像内存由解码后的像素决定，而不是压缩文件大小。Core 2 因此采用有界流水线：
读取尺寸、按 `maxSize` 等比缩放、解码/缩放、释放中间输入、合成一次、编码一次。

## 设置明确的解码预算

`maxSize` 会在保持长宽比的同时限制最长边，默认值为 2048。缩略图和预览应调低，
只有最终导出确实需要细节时才提高。

```ts
const result = await Marker.mark(options, {
  timeoutMs: 20_000,
  signal: controller.signal,
  onProgress({ jobId, phase, progress }) {
    console.log(jobId, phase, Math.round(progress * 100));
  },
});
```

上面的任务控制对象是第二个参数。`phase` 会经过 `queued`、`validating`、
`rendering` 或 `detecting`、可选 `encoding`，最后到 `completed`。进度观察器
自身抛错不会中断渲染。

## 取消与超时

- 派发前取消会以 `ImageMarkerError.code === 'ABORTED'` 拒绝。
- `timeoutMs` 会以 `TIMEOUT` 拒绝，并请求原生取消。
- 原生取消是幂等的，并释放对应活动任务。
- 每条进度、结果和结构化错误共享稳定 `jobId`。
- 任务完成后再 abort 不会反向改变成功结果。

队列应使用 `applyMany()` 或隐形水印 `*Many` API。结果保持输入顺序并逐项报告。
Web 并发上限为 4；iOS 和 Android 上限为 1，避免多个大位图同时达到峰值。

## 预览与最终导出

交互编辑器应先渲染低分辨率预览：

```ts
const preview = await adapter.renderPreview({
  recipe,
  input,
  maxSize: 1024,
});

const final = await adapter.exportOriginal({ recipe, input });
```

可选 Editor 包使用这一分层，并把两种渲染都委托给 Core，因此 UI 不会重复实现
原生图像处理。

## 参考基准

Core 2 release candidate 门禁会在 Android instrumentation 与 iOS simulator
测试中重复 12 次 1600×1200 到 400×300 的 downsample。本地 iPhone 16
simulator 参考运行中，iOS 的 12 次操作平均耗时 **0.059 秒**，报告的物理内存
峰值平均为 **50,668 kB**。

<Aside type="note" title="这是回归参考，不是设备保证">
  Simulator 时间和宿主报告内存用于本仓库回归。制定应用 SLA 前，请使用真实
  生产设备、图片、字体、格式和图层数量重新测量。
</Aside>

发布矩阵还会在宿主机、Android ABI、Objective-C++/Swift bridge 三条路径编译
共享 C++ 尺寸适配例程。原生压力测试会重复运行，而不是把一次成功渲染当作资源
稳定释放的证明。

## 实用调优顺序

1. 原生调用方需要文件时，优先文件输出而不是 base64。
2. 把 `maxSize` 设为仍满足细节要求的最小值。
3. 原生批处理并发保持 1；Web 并发提高到 4 前先测页面响应性。
4. 能通过一次有序 `Marker.mark()` 合成时，不要串联多次 mark。
5. 渲染前加载字体，并配置 `fontFallbacks`。
6. 透明和锐利边缘用 PNG，照片用 JPEG；WebP 仅用于 Android/Web。
7. Web robust 隐形检测使用 Worker，避免 CPU 搜索阻塞页面。
