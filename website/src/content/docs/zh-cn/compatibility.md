---
title: 兼容性
description: React Native Image Marker 对 React Native、平台、架构和 Expo 的支持情况。
---

Image Marker 支持 **iOS 13 或更高版本**、**Android API 24 或更高版本**以及现代浏览器。iOS 和 Android 同时支持 React Native 新架构和旧版 bridge。

## 当前支持情况

| 环境                     | 支持情况             | 说明                                            |
| ------------------------ | -------------------- | ----------------------------------------------- |
| iOS                      | 13+                  | 原生渲染使用 iOS 13 API 实现。                  |
| Android                  | API 24+              | Android 库声明的最低 SDK 版本为 API 24。        |
| React Native 新架构      | 支持，自库 v1.3.0 起 | 使用生成的 TurboModule 绑定。                   |
| React Native 旧版 bridge | 支持                 | 回退到 `NativeModules.ImageMarker`。            |
| Expo 开发构建            | 支持                 | 使用 Expo CLI 在本地构建，或使用 EAS 开发构建。 |
| Expo Go                  | 不支持               | Expo Go 未包含此包的原生代码。                  |
| Web / React Native Web   | 支持                 | 使用 Canvas 2D，返回图片 data URL。             |
| Windows                  | 仅浏览器             | 可以在网站中使用，但暂不支持 Windows 原生应用。 |

## Web 端行为

在浏览器中可以调用 `Marker.markText`、`Marker.markImage`、`Marker.mark`、`Marker.embedInvisible` 和 `Marker.detectInvisible`，参数与 React Native 相同。软件包会自动选择浏览器代码，不会加载 `NativeModules`。

Web 上的所有输出格式都会返回 `data:image/...` URL。图片来源可以是 URL 字符串、`{ uri }`、data URL、`Blob`、`File` 或已加载的浏览器图片。React Native 的数字资源 ID 需要先转换成 URL；例如 Expo Web 应用可使用 `expo-asset` 的 `Asset.fromModule(asset).uri`。

Canvas 与原生图形栈不会逐像素完全相同。字体可用性与度量、图片解码、抗锯齿、颜色处理和 JPEG 编码都可能存在差异；对像素结果敏感的场景应在每个目标平台上验证。远程图片还必须允许 CORS，否则浏览器会阻止导出 Canvas 和检测隐形水印；稳健检测会读取完整 Canvas 像素缓冲区，因此有意采用更高计算成本。

## 库版本指南

维护较旧的 React Native 应用时，请参考此表。

| React Native 或平台基线                                   | 库版本系列                                    |
| --------------------------------------------------------- | --------------------------------------------- |
| React Native 0.73+                                        | v1.2 或更高版本；如需新架构支持，请使用 v1.3+ |
| React Native 0.60–0.72                                    | v1.1.x                                        |
| React Native 0.60+，且 iOS 低于 13 或 Android 低于 API 24 | v1.0.x                                        |
| React Native 低于 0.60                                    | v0.5.2 或更早版本                             |

补丁版本旨在其对应的次版本系列内保持兼容。如需查看旧版 API 文档，请使用[版本与迁移](/zh-cn/migration/)页面上的链接。

## CI 兼容矩阵

CI 保留三条明确的测试线，不用单个示例构建笼统代表所有环境。

| 测试线                                       | 验证内容                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| React Native 0.73                            | 仓库内的裸 React Native 示例在 Android 分别构建旧架构与新架构，iOS 验证旧架构。                                              |
| React Native 0.86                            | 新建一个启用新架构的 Android 应用，安装打包后的库，并编译生成的 TurboModule 绑定。                                           |
| Expo SDK 57 / React Native 0.86 / React 19.2 | Expo 示例执行类型检查、导出原生与 Web bundle、生成开发构建工程，并完成 Android 编译。                                        |
| Chromium、Firefox、WebKit                    | Web 示例验证 JPG/PNG、`Blob`/`File`、CORS 错误、旋转裁剪、透明度、大图限制、带容差的像素差异、隐形水印重编码和六图检测语料。 |

## 验证架构路径

裸 React Native 示例包含一个**架构状态**面板，用于显示 TurboModules 和 Fabric 在运行时是否可用。Expo 示例已启用新架构，需要通过开发构建运行。

- **新架构**表示预期的运行时信号均可用。
- **Bridgeless 已关闭**不表示失败；bridgeless 模式与新架构构建设置彼此独立。
- 如果包报告尚未链接，请先重新构建原生应用，再修改 JavaScript 代码。
