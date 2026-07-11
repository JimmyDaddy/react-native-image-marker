# Image Marker follow-up review

## 范围

- iOS、Android、TypeScript 公共 API、Expo 示例及相关 CI/测试。
- 基线提交：`87501545a12a04c61035cebbbdc1797dad3382f1`。
- 本报告固化 2026-07-11 聊天审查中已确认、并由用户要求逐项处理的 1–10 项。

## 总结

未发现 P0/P1。确认 10 类具有实际用户影响的 P2 正确性、可靠性和跨平台一致性问题，均进入本次修复范围。

## 详细问题

### P2-1 iOS 文本阴影颜色解析错误

`ios/RCTImageMarker/Utils.swift` 使用错误的十六进制分量换算，导致非黑色阴影显著偏暗。应统一复用严格的 `UIColor(hex:)` 解析器并补颜色与像素测试。

### P2-2 Android 可选文本 style 缺省时崩溃

`android/.../base/TextStyle.kt` 强制解包可选参数，省略公开 API 中可选的 `style` 会触发 NPE。应使用完整默认样式并返回稳定结果。

### P2-3 Android 非零坐标文本旋转中心错误

`android/.../base/TextOptions.kt` 将宽高误作矩形右/下坐标。应围绕实际文本中心旋转并增加非零坐标像素测试。

### P2-4 backgroundImage.scale 跨平台语义不一致

iOS 将背景 scale 用作整个绘图上下文的 backing scale，Android 只缩放背景图。`scale` 属于单张 `ImageOptions`，本次统一为“只缩放所属图片；背景缩放决定输出画布尺寸，不隐式缩放水印、字体或绝对偏移”。

### P2-5 Expo 干净安装漏解析 pako

共享示例源码从 `example/src` 导入 `pako`，但 Expo Metro 映射未包含该依赖。应补映射并增加不依赖 `example/node_modules` 的 bundle smoke。

### P2-6 输出文件名可路径穿越，Android 非原子写入

两端未把 `filename` 限制为 basename；Android 直接截断目标文件写入。应拒绝路径分隔符和 `.`/`..`，并使用同目录临时文件成功编码后原子替换。

### P2-7 大图流水线峰值内存与并发无上限

iOS 多图加载无上限并发；Android 编码阶段仍持有全部输入，跨请求也无并发限制。应采用有界流水线、尽早释放输入，并覆盖大图/并发路径。

### P2-8 Android URI 与 Base64 JPEG EXIF 支持不足

`content://` 等常见 URI 被误判为 drawable 名称，Base64 JPEG 未应用 EXIF orientation 且总是全尺寸解码。应按 URI scheme 路由并统一 orientation/采样行为。

### P2-9 TypeScript legacy 单水印声明与运行时不一致

运行时支持单独的 `watermarkImage`，但 `watermarkImages` 类型为必填。应让声明与兼容行为一致，并保留“两者至少一个”的运行时校验。

### P2-10 quality/alpha 缺少一致边界校验

公开文档声明 `quality` 为 0–100、`alpha` 为 0–1，但两端处理不同。应在公共 JS 和两端原生入口拒绝非有限值与越界值，并补边界测试。

## 已执行验证

- 修复前基线：lint、Jest 8/8、root/example/Expo typecheck、iOS 原生测试 19/19，以及 iOS/Android RGBA 公共 E2E 已通过。
- 修复后验证将在“修复执行记录”中追加。

## 测试覆盖缺口

- 背景 scale 0.5/2 的跨平台像素契约。
- 文本缺省 style、非零坐标旋转中心。
- EXIF 实际像素方向、`content://` 与 Base64 JPEG。
- 路径穿越、同名并发输出及失败后的半成品清理。
- Expo 干净安装 bundle。

## 修复执行记录（2026-07-11）

### P2-1 已完成

- iOS 阴影颜色统一复用严格的 `UIColor(hex:)`，无效或缺失颜色返回 `PARAMS_INVALID`；默认文本颜色统一为黑色。
- 变更：`ios/RCTImageMarker/{Utils,TextStyle}.swift`、iOS 颜色与像素测试。

### P2-2 已完成

- Android 缺省 `style` 使用完整可见默认值，错误类型统一转换为 `INVALID_PARAMS`。
- 变更：`android/.../base/{TextStyle,TextOptions}.kt` 及默认样式测试。

### P2-3 已完成

- Android 文本旋转中心改为 `x + width / 2`、`y + height / 2`。
- 变更：`android/.../base/TextOptions.kt`、纯单测与像素回归测试。

### P2-4 已完成

- 两端统一为背景 scale 只改变背景和画布，不隐式改变水印、字体、绝对坐标；尺寸逐轴 round 且至少 1 像素。
- 覆盖 0.3、0.5、1.1、2 以及 iOS @2x/@3x 逻辑尺寸和 Android loader 的背景/水印 scale 路由。

### P2-5 已完成

- Expo Metro 显式映射 `pako`，CI 在未安装 `example/node_modules` 时执行真实 Android export smoke。
- 变更：`expo-example/{metro.config.js,package.json}`、`.github/workflows/ci.yml`。

### P2-6 已完成

- 两端拒绝路径分隔符、`.`、`..`、控制字符和空 basename；Android 改为同目录临时文件、fsync、原子替换和失败清理。
- 变更：两端 options/output path、`AtomicFileWriter` 及成功/失败测试。

### P2-7 已完成

- Android 和 iOS 均对完整加载、渲染、编码流水线做模块级限流；渲染后、编码前释放输入。
- iOS 接入 RCTImageLoader cancellation block 并处理取消/完成竞态；Android 恢复 `maxSize` 的等比解码上限，覆盖 Coil、Base64 和 resource。
- 变更：平台 limiter、owned-resource pipeline、image-size limiter、取消/并发/生命周期测试。

### P2-8 已完成

- Android 按 URI scheme 路由 Coil，支持 `content://` 与 `android.resource://`；Base64 JPEG 应用 EXIF orientation 并按目标尺寸采样。
- 非对称 JPEG fixture 验证了实际旋转方向。

### P2-9 已完成

- `watermarkImages` 改为可选，legacy `watermarkImage` 单独使用可通过 TypeScript 和运行时；两者均缺失仍由公共运行时校验拒绝。
- 为保持已有导出 interface 的兼容性，有意不改为破坏性 union 类型。

### P2-10 已完成

- JS、iOS、Android 统一校验 quality 为有限整数 0–100、alpha 为有限数 0–1；Android 使用 Double 校验后再转 Int，避免截断。
- 同时校验已恢复生效的 Android `maxSize` 为正有限整数。

### 修复后验证

- `npm run lint`：通过。
- `npm test -- --runInBand`：13/13 通过。
- root、example、Expo typecheck：通过。
- `npm run prepack`、`npm run docs`、Expo Android export smoke：通过。
- `actionlint .github/workflows/ci.yml`、`git diff --check`：通过。
- Android unit：52/52；API 34 Loader：8/8；Renderer：17/17；公共 JS→native E2E：2/2。
- iOS CI 白名单：27/27；Android library 与 iOS Simulator Release 构建：通过。

全部条目均为“已完成”，不存在阻塞或跳过项。
