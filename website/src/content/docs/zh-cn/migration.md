---
title: 版本与迁移
description: 升级到当前 API，并查找旧版 React Native Image Marker 的文档。
---

主文档介绍当前的 v1.x 版本线。旧版快照仅作为迁移参考保留，不再为整个网站分别维护副本。

## 当前 API 选择

- 仅处理文字时，继续使用 `Marker.markText`。
- 仅处理图片时，继续使用 `Marker.markImage`。
- 如需在一次渲染中按顺序处理文字和图片图层，请使用 `Marker.mark`。
- 在每个图层上使用 `position`。`positionOptions` 仅为兼容性保留。
- 使用复数形式的 `watermarkImages` 数组，而不是 `watermarkImage` 和 `watermarkPositions`。

## 从旧版 v1 代码迁移

```diff
 watermarkTexts: [
   {
     text: 'Demo',
-    positionOptions: { position: Position.center },
+    position: { position: Position.center },
   },
 ]
```

```diff
-watermarkImage: { src: logo },
-watermarkPositions: { position: Position.topRight },
+watermarkImages: [
+  {
+    src: logo,
+    position: { position: Position.topRight },
+  },
+],
```

## 添加 Web 目标

Marker 方法名和参数无需改变。Web 端需要把数字形式的 React Native 资源转换成浏览器 URL，接收数据 URL 而不是临时文件路径，并为远程图片配置 CORS。其他浏览器差异请参阅[兼容性](/zh-cn/compatibility/#web-端行为)。

## 历史版本参考

- [v1.1.x Wiki](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.1.x)
- [v1.0.x Wiki](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.0.x)
- [v0.9.2 Wiki](https://github.com/JimmyDaddy/react-native-image-marker/wiki/0.9.2)
- [更新日志](https://github.com/JimmyDaddy/react-native-image-marker/blob/master/CHANGELOG.md)

如果旧应用依赖低于 iOS 13 或 Android API 24 的平台版本，请使用[兼容性](/zh-cn/compatibility/)中列出的旧版本线，不要强行让当前原生实现在这些基线上运行。
