---
title: Core 2 新增内容
description: Core 2 版本亮点、breaking changes、Editor 接入方式与 v1 LTS 升级判断。
---

Core 2 把 Image Marker 从一组渲染调用升级为可控制、可移植的图片工作流。它是
文档根路径上的当前版本；v1 继续保留在受保护的维护线上。

## Core 2.1 与共享工具链

Core 2.1 新增跨平台 `Marker.getImageInfo()`、一致的富文本布局控制与直接 Recipe
包集成。同一份 Recipe v2 文档现在可以流经五个边界清晰的包：

| 包 | 职责 |
| --- | --- |
| [`@image-marker/recipe`](/zh-cn/recipe/) | Schema、验证、迁移、模板与图层操作 |
| `react-native-image-marker` | iOS、Android 与浏览器渲染 |
| [`react-native-image-marker-editor`](/zh-cn/guides/editor/) | 可选 React Native 与 Web 交互 UI |
| [`@image-marker/node`](/zh-cn/node/) | 基于 Sharp 的纯 Node.js 服务端渲染 |
| [`@image-marker/cli`](/zh-cn/cli/) | 终端与 CI 自动化 |

## 主要变化

- `MarkerResult` 提供任务 ID、耗时、格式、MIME 类型和元数据策略。
- Recipe v2 提供稳定图层 ID、有序混合图层、条件、显隐、锁定、验证与显式迁移。
- 支持进度、超时、取消、稳定错误码和有上限的批处理并发。
- 支持字体 fallback、Android/Web WebP、方向归一化，并移除源 EXIF/GPS。
- Core 2.1 提供跨平台图片检查，以及富文本宽度、行高、字距、行数限制、溢出与
  对齐控制。
- 提供隐形追踪批次、Worker、稳健性工具和可选 Content Credentials 组合。
- Editor 0.3 提供正式面板、多选、分组、对齐、操作 handles、viewport、
  autosave、模板、品牌配置与插件。

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
