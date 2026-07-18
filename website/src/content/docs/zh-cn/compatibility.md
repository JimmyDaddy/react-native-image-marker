---
title: 兼容性
description: React Native Image Marker 对 React Native、平台、架构和 Expo 的支持情况。
---

Image Marker 支持 **iOS 13 或更高版本**、**Android API 24 或更高版本**以及现代浏览器。iOS 和 Android 同时支持 React Native 新架构和旧版 bridge。

## 当前支持情况

| 环境 | 支持情况 | 说明 |
| --- | --- | --- |
| iOS | 13+ | 原生渲染使用 iOS 13 API 实现。 |
| Android | API 24+ | Android 库声明的最低 SDK 版本为 API 24。 |
| React Native 新架构 | 支持，自库 v1.3.0 起 | 使用生成的 TurboModule 绑定。 |
| React Native 旧版 bridge | 支持 | 回退到 `NativeModules.ImageMarker`。 |
| Expo 开发构建 | 支持 | 使用 Expo CLI 在本地构建，或使用 EAS 开发构建。 |
| Expo Go | 不支持 | Expo Go 未包含此包的原生代码。 |
| Web / React Native Web | 支持 | 使用 Canvas 2D，返回图片 data URL。 |
| Windows | 仅浏览器 | 可以在网站中使用，但暂不支持 Windows 原生应用。 |

## Web 端行为

在浏览器中仍然可以调用 `Marker.markText`、`Marker.markImage` 和 `Marker.mark`，参数与 React Native 相同。软件包会自动选择浏览器代码，不会加载 `NativeModules`。

Web 上的所有输出格式都会返回 `data:image/...` URL。图片来源可以是 URL 字符串、`{ uri }`、data URL、`Blob`、`File` 或已加载的浏览器图片。React Native 的数字资源 ID 需要先转换成 URL；例如 Expo Web 应用可使用 `expo-asset` 的 `Asset.fromModule(asset).uri`。

Canvas 与原生图形栈不会逐像素完全相同。字体可用性与度量、图片解码、抗锯齿、颜色处理和 JPEG 编码都可能存在差异；对像素结果敏感的场景应在每个目标平台上验证。远程图片还必须允许 CORS，否则浏览器会阻止导出 Canvas。

## 库版本指南

维护较旧的 React Native 应用时，请参考此表。

| React Native 或平台基线 | 库版本系列 |
| --- | --- |
| React Native 0.73+ | v1.2 或更高版本；如需新架构支持，请使用 v1.3+ |
| React Native 0.60–0.72 | v1.1.x |
| React Native 0.60+，且 iOS 低于 13 或 Android 低于 API 24 | v1.0.x |
| React Native 低于 0.60 | v0.5.2 或更早版本 |

补丁版本旨在其对应的次版本系列内保持兼容。如需查看旧版 API 文档，请使用[版本与迁移](/zh-cn/migration/)页面上的链接。

## 验证架构路径

仓库中的 React Native 和 Expo 示例应用都包含一个**架构状态**面板，用于显示 TurboModules 和 Fabric 在运行时是否可用。

- **新架构**表示预期的运行时信号均可用。
- **Bridgeless 已关闭**不表示失败；bridgeless 模式与新架构构建设置彼此独立。
- 如果包报告尚未链接，请先重新构建原生应用，再修改 JavaScript 代码。
