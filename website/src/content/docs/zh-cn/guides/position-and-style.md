---
title: 定位与样式
description: 为文本和图像水印设置锚点、偏移、大小、旋转和样式。
---

## 锚点定位

设置一个具名 `Position`，并使用 `X` 和 `Y` 指定相对于该锚点的偏移量。

```ts
{
  text: '© Acme Studio',
  position: {
    position: Position.bottomRight,
    X: 24,
    Y: 24,
  },
}
```

可用锚点包括 `topLeft`、`topCenter`、`topRight`、`bottomLeft`、`bottomCenter`、`bottomRight` 和 `center`。

使用具名位置时，如果省略相关坐标轴，则会保留 `20` 的兼容性内边距。如果图层需要紧贴所选边缘，请设置 `edgeInset: 0`。

```ts
position: {
  position: Position.topLeft,
  edgeInset: 0,
}
```

## 绝对坐标和百分比坐标

省略具名锚点后，`X` 和 `Y` 会被视为绝对坐标。数字表示输出图像坐标空间中的像素；字符串可以是相对于背景图像计算的百分比。

```ts
position: {
  X: '8%',
  Y: '12%',
}
```

## 响应式文本

当文本需要随背景图像宽度缩放时，请使用 `fontSizeRatio`。

```ts
style: {
  color: '#FFFFFF',
  fontSizeRatio: 0.03,
}
```

除非已经确认所有目标尺寸下所需的行为，否则不要同时设置 `fontSize` 和 `fontSizeRatio`。

## 文本样式

以下文字样式可用于 iOS、Android 和 Web：

| 属性 | 用途 |
| --- | --- |
| `color` | 文本颜色 |
| `fontName` | 平台字体族或 iOS PostScript 名称 |
| `fontSize` / `fontSizeRatio` | 固定或响应式大小 |
| `bold`、`italic`、`underline`、`strikeThrough` | 字体装饰 |
| `rotate`、`skewX` | 文本变换 |
| `shadowStyle` | 阴影的偏移量、半径和颜色 |
| `textBackgroundStyle` | 内边距、颜色、拉伸模式和圆角半径 |

当背景应贴合文本而不是拉伸时，请使用 `TextBackgroundType.none`。其序列化值为 `fit`。

### 自定义字体

该软件包不内置字体。

- 在 iOS 上，`fontName` 会传递给 `UIFont(name:size:)`；请使用字体注册后的 PostScript 名称，并将字体包含在应用包中。
- 在 Android 上，该名称通过 React Native 的字体管理器解析；请将链接后的字体文件放在常规 Android 资源目录中。
- 在 Web 上，该名称会成为 Canvas 的 CSS 字体族。调用 Marker 前应先加载 Web 字体，否则浏览器会使用回退字体。
- 如果名称无法解析，则会使用平台默认字体。

请先在常规 React Native `<Text>` 或 Web Canvas 中确认字体，再将对应平台的字体族名称传入标记器样式。

## 图像图层

图像水印支持 `scale`、`rotate`、`alpha`、`position` 和 `trimTransparentPadding`。缩放、旋转和定位前，会先裁剪外部透明像素。请根据预期的输出图像尺寸调整 `scale`。
