---
title: 兼容性
description: React Native Image Marker 对 React Native、平台、架构和 Expo 的支持情况。
---

Core 2 支持 **React Native 0.73+**、**React 18+**、工具链
**Node 20.19+**、**iOS 13+**、**Android API 24+** 与现代浏览器。iOS 和
Android 在新架构与旧 bridge 下使用同一个强类型公共契约。

## 当前支持情况

| 环境                     | 支持情况             | 说明                                            |
| ------------------------ | -------------------- | ----------------------------------------------- |
| iOS                      | 13+                  | 原生渲染使用 iOS 13 API 实现。                  |
| Android                  | API 24+              | Android 库声明的最低 SDK 版本为 API 24。        |
| React Native             | 0.73+                | Core 2 peer 基线；已测试线路见下表。            |
| React                    | 18+                  | Expo 测试线覆盖 React 19。                      |
| React Native 新架构      | 支持                 | 使用完整生成的 TurboModule 绑定。               |
| React Native 旧版 bridge | 支持                 | 保持相同的类型、结果、错误和取消语义。          |
| Expo 开发构建            | 支持                 | 使用 Expo CLI 在本地构建，或使用 EAS 开发构建。 |
| Expo Go                  | 不支持               | Expo Go 未包含此包的原生代码。                  |
| Web / React Native Web   | 支持                 | 使用 Canvas 2D；`MarkerResult.uri` 为 data URL。|
| Windows                  | 仅浏览器             | 可以在网站中使用，但暂不支持 Windows 原生应用。 |

## Web 端行为

在浏览器中，可见水印、Recipe、隐形追踪批次、robust 检测与 Content Credentials 适配器都使用和 React Native 相同的公共 API。软件包会自动选择浏览器代码，不会加载 `NativeModules`。

Web 调用返回结构化 `MarkerResult`；所有格式的 `result.uri` 都是
`data:image/...` URL。图片来源可以是 URL 字符串、`{ uri }`、data URL、
`Blob`、`File` 或已加载的浏览器图片。React Native 数字资源 ID 需要先转换
为 URL，例如使用 `expo-asset` 的 `Asset.fromModule(asset).uri`。

Canvas 与原生图形栈不会逐像素完全相同。字体可用性与度量、图片解码、抗锯齿、颜色处理和 JPEG 编码都可能存在差异；对像素结果敏感的场景应在每个目标平台上验证。远程图片还必须允许 CORS，否则浏览器会阻止导出 Canvas 和检测隐形水印；稳健检测会读取完整 Canvas 像素缓冲区，因此有意采用更高计算成本。

## 库版本指南

维护较旧的 React Native 应用时，请参考此表。

| 应用基线                                                   | 推荐版本系列                                  |
| --------------------------------------------------------- | --------------------------------------------- |
| React Native 0.73+，可以接受 breaking API                 | Core 2                                        |
| 现有 React Native 0.73+ 应用继续留在 v1                   | 最新 v1 LTS（`npm install react-native-image-marker@1`） |
| React Native 0.60–0.72                                    | v1.1.x                                        |
| React Native 0.60+，且 iOS 低于 13 或 Android 低于 API 24 | v1.0.x                                        |
| React Native 低于 0.60                                    | v0.5.2 或更早版本                             |

Core 2 是主版本升级，因为返回类型、Recipe schema、错误、任务控制和生成原生
边界均有变化。完整清单见[从 v1 迁移到 v2](/zh-cn/migration/)。

## CI 兼容矩阵

CI 保留三条明确的测试线，不用单个示例构建笼统代表所有环境。

| 测试线                                       | 验证内容                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| React Native 0.73                            | 裸示例完成类型检查；Android 构建新旧架构，iOS 验证 bridge、共享 C++ bridge 和选定模拟器测试。                                  |
| React Native 0.86                            | 新建一个启用新架构的 Android 应用，安装打包后的库，并编译生成的 TurboModule 绑定。                                           |
| Expo SDK 57 / React Native 0.86 / React 19.2 | Expo 示例执行类型检查、导出原生与 Web bundle、生成开发构建工程，并完成 Android 编译。                                        |
| Chromium、Firefox、WebKit                    | Web 示例验证 JPG/PNG、`Blob`/`File`、CORS 错误、旋转裁剪、透明度、大图限制、带容差的像素差异、隐形水印重编码、响应式批量检测，以及六图语料的 0.9×–1.1× 恢复。 |

## 输出差异

| 能力 | iOS | Android | Web |
| --- | --- | --- | --- |
| JPEG / PNG | 支持 | 支持 | 支持 |
| WebP | 明确拒绝 | 支持 | 支持 |
| Base64/data URL | 支持 | 支持 | 所有输出均为 data URL |
| 方向 | 归一化 | 归一化 | 浏览器解码时归一化 |
| 复制 EXIF/GPS | 剥离 | 剥离 | 剥离 |
| 最大批量并发 | 1 | 1 | 4 |

## 验证架构路径

裸 React Native 示例包含一个**架构状态**面板，用于显示 TurboModules 和 Fabric 在运行时是否可用。Expo 示例已启用新架构，需要通过开发构建运行。

- **新架构**表示预期的运行时信号均可用。
- **Bridgeless 已关闭**不表示失败；bridgeless 模式与新架构构建设置彼此独立。
- 如果包报告尚未链接，请先重新构建原生应用，再修改 JavaScript 代码。
