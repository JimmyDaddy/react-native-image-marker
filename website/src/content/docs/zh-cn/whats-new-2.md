---
title: Core 2 新增内容
description: Core 2 版本亮点、breaking changes、Editor 接入方式与 v1 LTS 升级判断。
---

Core 2 把 Image Marker 从一组渲染调用升级为可控制、可移植的图片工作流。它是
文档根路径上的当前版本；v1 继续保留在受保护的维护线上。

## 主要变化

- `MarkerResult` 提供任务 ID、耗时、格式、MIME 类型和元数据策略。
- Recipe v2 提供稳定图层 ID、有序混合图层、条件、显隐、锁定、验证与显式迁移。
- 支持进度、超时、取消、稳定错误码和有上限的批处理并发。
- 支持字体 fallback、Android/Web WebP、方向归一化，并移除源 EXIF/GPS。
- 提供隐形追踪批次、Worker、稳健性工具和可选 Content Credentials 组合。
- 独立版本的
  [`react-native-image-marker-editor`](/zh-cn/guides/editor/) 可用于可视化编辑
  Recipe v2。

## Breaking changes 概览

| v1 | Core 2 |
| --- | --- |
| 渲染方法返回 URI 字符串 | 从 `MarkerResult` 读取 `result.uri` |
| Recipe v1 使用 `watermarks` 和顶层输出字段 | Recipe v2 使用稳定 `layers` 和嵌套 `output` |
| 接受旧别名 | 使用 `position`、`watermarkImages` 和当前有序图层字段 |
| 错误结构不稳定 | 处理 `ImageMarkerError.code` |
| 不能主动控制任务 | 传入 `signal`、`timeoutMs` 与 `onProgress` |

切换 major 前先阅读完整的[迁移清单](/zh-cn/migration/)，然后执行一次干净的
原生重建。

## 是否应该现在升级？

新应用，或需要 Recipe 编辑、任务控制、Web 渲染、追踪工作流和 Editor 的应用，
应选择 Core 2。现有应用如果仍依赖旧返回值和 Recipe contract，可以继续使用
[`react-native-image-marker@1`](/v1/zh-cn/)；v1 会按照
[支持政策](/zh-cn/support-policy/)继续接收关键修复。

## 立即体验

- [安装 Core 2](/zh-cn/getting-started/)
- [打开 Playground](/zh-cn/playground/)
- [打开 Editor 工作流](/zh-cn/playground/?workflow=editor#editor-playground)
- [浏览 Core API](/zh-cn/api/)
- [浏览 Editor API](/zh-cn/guides/editor/reference/)
