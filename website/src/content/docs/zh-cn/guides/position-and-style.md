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

## 单个与平铺排列

不提供 `layout` 时仍只绘制一个按位置放置的水印。将 `layout.type` 设为 `tile`，可以让文字或图片图层铺满整个输出图片。

```ts
{
  type: 'text',
  text: 'CONFIDENTIAL',
  layout: {
    type: 'tile',
    gapX: '8%',
    gapY: '7%',
    offsetX: '-2%',
    stagger: true,
  },
  style: {
    color: '#FFFFFF88',
    fontSize: 30,
    rotate: -24,
  },
}
```

`gapX`、`gapY`、`offsetX` 和 `offsetY` 可以使用输出像素或百分比。间距按照每个副本旋转后的可见边界计算。平铺图层不能同时设置 `position`；出现冲突时会直接报错，不会猜测应采用哪一个参数。

每个图层最多生成 4096 个副本。图片图层只解码一次 Logo 并复用于所有位置；一个图层平铺完成后，才会开始绘制下一个图层。

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

| 属性                                           | 用途                             |
| ---------------------------------------------- | -------------------------------- |
| `color`                                        | 文本颜色                         |
| `fontName`                                     | 平台字体族或 iOS PostScript 名称 |
| `fontSize` / `fontSizeRatio`                   | 固定或响应式大小                 |
| `bold`、`italic`、`underline`、`strikeThrough` | 字体装饰                         |
| `rotate`、`skewX`                              | 文本变换                         |
| `shadowStyle`                                  | 阴影的偏移量、半径和颜色         |
| `strokeStyle`                                  | 文字描边的颜色和宽度             |
| `textBackgroundStyle`                          | 内边距、颜色、拉伸模式和圆角半径 |

当背景应贴合文本而不是拉伸时，请使用 `TextBackgroundType.none`。其序列化值为 `fit`。

### 文字描边

当文字跨越照片中的明暗区域时，可使用对比色描边保持清晰可读。

```ts
style: {
  color: '#FFFFFF',
  fontSize: 32,
  strokeStyle: {
    color: '#0F172ACC',
    width: 2,
  },
}
```

描边会计入锚点定位和平铺间距。将 `strokeStyle` 设为 `null` 或直接省略，即可保持原来的纯填充文字效果。

### 文字透明度

在文字图层上设置 `alpha`，即可同时调整文字填充、描边、阴影和背景的透明度，无需逐个改写颜色。取值范围为 `0` 到 `1`，默认值为 `1`。

```ts
{
  text: 'CONFIDENTIAL',
  alpha: 0.55,
  style: { color: '#FFFFFF', fontSize: 32 },
}
```

### 自定义字体

该软件包不内置字体。

- 在 iOS 上，`fontName` 会传递给 `UIFont(name:size:)`；请使用字体注册后的 PostScript 名称，并将字体包含在应用包中。
- 在 Android 上，该名称通过 React Native 的字体管理器解析；请将链接后的字体文件放在常规 Android 资源目录中。
- 在 Web 上，该名称会成为 Canvas 的 CSS 字体族。调用 Marker 前应先加载 Web 字体，否则浏览器会使用回退字体。
- 如果名称无法解析，则会使用平台默认字体。

请先在常规 React Native `<Text>` 或 Web Canvas 中确认字体，再将对应平台的字体族名称传入标记器样式。

## 图像图层

图像水印支持 `scale`、`rotate`、`alpha`、`position`、`layout` 和 `trimTransparentPadding`。缩放、旋转、定位或平铺前，会先裁剪外部透明像素。请根据预期的输出图像尺寸调整 `scale`。
