---
title: API 参考
description: React Native Image Marker 的自动生成 API 参考文档。
---

每次构建网站时，都会从公开的 TypeScript 声明生成 API 参考文档。

## 方法

- [`Marker.markText`](/zh-cn/api/classes/marker/#marktext) 渲染纯文字图层。
- [`Marker.markImage`](/zh-cn/api/classes/marker/#markimage) 渲染纯图片图层。
- [`Marker.mark`](/zh-cn/api/classes/marker/#mark) 渲染按顺序排列的混合图层。
- [`Marker.createRecipe`](/zh-cn/api/classes/marker/#createrecipe) 创建可复用的批量处理流程。
- [`Marker.embedInvisible`](/zh-cn/api/classes/marker/#embedinvisible) 将经过认证的短追踪 ID 写入图片像素。
- [`Marker.detectInvisible`](/zh-cn/api/classes/marker/#detectinvisible) 恢复并验证隐形追踪 ID。
- `Marker.embedInvisibleMany` 与 `Marker.detectInvisibleMany` 执行同序、逐项报告的追踪批次。
- `Marker.embedInvisibleWithCredentials` 与 `Marker.verifyContentCredentials` 把像素 locator 和应用提供的签名适配器组合起来。

Core 2 的可见渲染与隐形嵌入方法返回 `MarkerResult`。图像位于 `result.uri`；
诊断可读取 `jobId`、`operation`、`format`、`mimeType`、`durationMs` 和
`metadata`。单次操作的第二个参数接受 `MarkerJobOptions`；失败会返回带稳定
错误码的 `ImageMarkerError`。

Recipe v2 序列化稳定 `layers` 和嵌套 `output`。旧持久化文档应先通过
`migrateWatermarkRecipe()` 再创建运行时 Recipe。

## 从主要选项类型开始

- [`TextMarkOptions`](/zh-cn/api/interfaces/textmarkoptions/)
- [`ImageMarkOptions`](/zh-cn/api/interfaces/imagemarkoptions/)
- [`MarkOptions`](/zh-cn/api/interfaces/markoptions/)
- [`PositionOptions`](/zh-cn/api/interfaces/positionoptions/)
- [`EmbedInvisibleWatermarkOptions`](/zh-cn/api/interfaces/embedinvisiblewatermarkoptions/)
- [`DetectInvisibleWatermarkOptions`](/zh-cn/api/interfaces/detectinvisiblewatermarkoptions/)
- [`InvisibleWatermarkDetectionResult`](/zh-cn/api/interfaces/invisiblewatermarkdetectionresult/)
- [`MarkerResult`](/zh-cn/api/interfaces/markerresult/)
- [`MarkerJobOptions`](/zh-cn/api/interfaces/markerjoboptions/)

使用侧边栏中生成的 **API 参考** 分组，浏览所有枚举、接口和类型别名。
