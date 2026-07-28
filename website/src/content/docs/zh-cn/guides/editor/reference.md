---
title: Editor API 参考
description: react-native-image-marker-editor controller、组件、adapter、状态和导出类型导航。
---

Editor 的详细成员页面由公开 TypeScript 声明自动生成。类型名与源码注释保持英文，
本页提供中文入口和使用边界。

## 主要入口

- [`ImageMarkerEditorController`](/guides/editor/reference/classes/imagemarkereditorcontroller/)
  — Recipe v2 状态、选择、图层修改、undo/redo、键盘操作和持久化。
- [`ImageMarkerEditor`](/guides/editor/reference/functions/imagemarkereditor/)
  — React Native/Web 编辑画布。
- [`ImageMarkerEditorToolbar`](/guides/editor/reference/functions/imagemarkereditortoolbar/)
  — 可组合的图层操作工具栏。
- [`createCoreEditorAdapter`](/guides/editor/reference/functions/createcoreeditoradapter/)
  — 按需把预览和最终导出委托给 Core。

## Props 与 adapter

- [`ImageMarkerEditorProps`](/guides/editor/reference/interfaces/imagemarkereditorprops/)
- [`ImageMarkerEditorToolbarProps`](/guides/editor/reference/interfaces/imagemarkereditortoolbarprops/)
- [`ImageMarkerEditorRenderAdapter`](/guides/editor/reference/interfaces/imagemarkereditorrenderadapter/)
- [`EditorRenderRequest`](/guides/editor/reference/interfaces/editorrenderrequest/)

## 状态与导出

- [`EditorState`](/guides/editor/reference/interfaces/editorstate/)
- [`EditorSafeArea`](/guides/editor/reference/interfaces/editorsafearea/)
- [`EditorSnapContext`](/guides/editor/reference/interfaces/editorsnapcontext/)
- [`EditorExportOptions`](/guides/editor/reference/interfaces/editorexportoptions/)
- [`EditorExportResult`](/guides/editor/reference/interfaces/editorexportresult/)

继续阅读[接入指南](/zh-cn/guides/editor/)，或直接
[打开 Editor Playground](/zh-cn/playground/?workflow=editor#editor-playground)。
