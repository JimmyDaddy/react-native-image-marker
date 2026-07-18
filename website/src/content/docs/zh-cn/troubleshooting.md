---
title: 故障排查
description: 解决链接、Expo、字体、输出、质量、定位和内存问题。
---

## “这个包似乎没有正确链接”

JavaScript 层无法找到生成的 TurboModule 或旧版原生模块。

1. 在 iOS 上运行 `npx pod-install`。
2. 安装此包后，重新构建原生应用。
3. 如果使用 Expo，请确认正在运行开发构建，而不是 Expo Go。
4. 停止 Metro；如有需要，从模拟器或设备中删除应用，然后重新构建。

## 在裸 React Native 应用中可用，但在 Expo Go 中不可用

这是预期行为。React Native Image Marker 包含原生 iOS 和 Android 代码，而 Expo Go 并未内置这些代码。请使用 `npx expo run:android` 或 `npx expo run:ios` 在本地构建并安装开发构建，也可以使用 EAS Build 创建开发构建。安装或升级此包后，请重新构建原生应用；仅重启 Metro 无法添加原生模块。

## 自定义字体被忽略

`fontName` 必须是平台字体族名称，不一定是文件名。

- 首先在常规 React Native `<Text>` 组件中验证该字体。
- 在 iOS 上，请使用已注册的 PostScript 名称，并将字体包含在应用包中。
- 在 Android 上，请确保字体已链接到 Android assets 中。
- 在 Web 上，请先加载字体，并确认 Canvas 能够使用它，再调用 Marker。

无法解析的字体会回退到平台默认字体。

## Web 无法加载或导出远程图片

Canvas 导出受浏览器 CORS 规则约束。图片服务器必须返回合适的 `Access-Control-Allow-Origin` 响应头；否则请使用同源 URL、本地 `File` / `Blob` 或数据 URL。SDK 会将这类问题报告为加载错误或受污染 Canvas 错误。

如果 Expo Web 传入数字形式的 `require()` 资源 ID，请先用 `expo-asset` 的 `Asset.fromModule(asset).uri` 转换，再把 URL 或 `{ uri }` 传给 Marker。React Native Web 并不提供 `Image.resolveAssetSource()`。

## 二维码或 Logo 看起来模糊

- 保存为 `ImageFormat.png`。
- 使用 `scale` 设置水印的最终尺寸，不要预先压缩源文件。
- 清晰线条图像应避免使用 JPEG。
- 当不可见的外围像素导致可见标记意外变小时，请使用 `trimTransparentPadding: true`。

## 旋转后的结果被裁剪或尺寸变大

`RotationCanvasMode.expand` 会保留完整的旋转图像，因此可能扩大画布。当输出尺寸必须保持不变且可以接受裁剪时，请使用 `RotationCanvasMode.crop`。

## 图层没有紧贴边缘

当省略某个坐标轴时，命名位置会使用兼容性内边距。请设置 `edgeInset: 0`，或提供明确的 `X` 和 `Y` 偏移量。

## 结果没有出现在照片图库中

在原生目标上，JPEG 和 PNG 结果都是缓存文件。Image Marker 不会请求媒体库权限，也不会将文件保存到相机胶卷。请将返回的路径与媒体库包配合使用，例如 [React Native CameraRoll](https://github.com/react-native-cameraroll/react-native-cameraroll)。在 Web 上，请把返回的数据 URL 用作下载链接。

## 大图占用过多内存

图像合成和数据 URL 编码所需的内存都与解码后的位图大小成正比。请优先使用原生文件输出；如果不需要完整分辨率，请在合成前缩放输入图像，并按顺序处理大型批次。Web 的所有输出都是数据 URL，因此更需要控制源图尺寸。

## 仍然无法解决？

搜索[现有 issue](https://github.com/JimmyDaddy/react-native-image-marker/issues)，或提交包含以下信息的报告：

- React Native 和库版本
- iOS、Android 或浏览器版本
- 新架构和 Expo 状态
- 输入源类型和输出格式
- 最小化的选项对象和完整错误消息
