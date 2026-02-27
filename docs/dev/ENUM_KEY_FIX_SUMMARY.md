# Enum Key Fix Summary - 使用字符串字面量联合类型解决方案

## 问题背景

在 React Native New Architecture 中，Codegen 工具会根据 TypeScript 规范生成 C++ 代码。我们遇到了一个关键问题：

### 原始错误
```
error: no member named 'TopLeft' in 'facebook::react::ImageMarkerPosition'; 
did you mean 'topLeft'?
```

### 根本原因分析

经过深入研究，我们发现：

1. **Codegen 根据枚举值（value）生成 C++ 枚举成员**，而不是键（key）
2. **原生实现（iOS Swift 和 Android Kotlin）期望 camelCase 字符串**
3. **TurboModule 直接委托给 Legacy 实现**，没有做任何转换

如果使用 PascalCase 枚举值：
- ✅ 修复 Codegen 生成的 C++ 编译错误
- ❌ 但会导致原生代码无法识别这些值（Breaking Change）
- ❌ 需要修改大量原生代码

## 解决方案：使用字符串字面量联合类型

根据 [React Native Codegen 文档](https://stackoverflow.com/questions/77303972/react-native-fabric-turbo-using-enum-or-type/77512707)，Codegen 完全支持字符串字面量联合类型（String Literal Union Types）。

### 方案架构

```typescript
// specs/NativeImageMarker.ts - Codegen 规范
// 使用字符串字面量联合类型，值为 camelCase
export type Position = 
  | 'topLeft' 
  | 'topCenter' 
  | 'topRight' 
  | 'bottomLeft' 
  | 'bottomCenter' 
  | 'bottomRight' 
  | 'center';

// src/types/index.ts - 用户 API
// 使用枚举，键为 PascalCase，值为 camelCase
export enum Position {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight',
  Center = 'center',
}
```

### 优势

1. ✅ **Codegen 兼容**：字符串字面量联合类型被 Codegen 正确处理
2. ✅ **原生兼容**：camelCase 值匹配 iOS/Android 原生实现
3. ✅ **用户友好**：TypeScript 枚举提供更好的开发体验
4. ✅ **向后兼容**：不会破坏现有用户代码
5. ✅ **类型安全**：两种定义都提供完整的类型检查

## 修改内容

### 1. Codegen 规范 (`specs/NativeImageMarker.ts`)

**修改前（使用枚举）：**
```typescript
export enum Position {
  TopLeft = 'TopLeft',
  TopCenter = 'TopCenter',
  // ...
}
```

**修改后（使用字符串字面量联合类型）：**
```typescript
export type Position = 
  | 'topLeft' 
  | 'topCenter' 
  | 'topRight' 
  | 'bottomLeft' 
  | 'bottomCenter' 
  | 'bottomRight' 
  | 'center';

export type TextBackgroundType = 
  | 'stretchX' 
  | 'stretchY' 
  | 'fit';

export type ImageFormat = 
  | 'png' 
  | 'jpg' 
  | 'base64';
```

### 2. TypeScript 类型定义 (`src/types/index.ts`)

**修改前（PascalCase 值）：**
```typescript
export enum Position {
  TopLeft = 'TopLeft',
  TopCenter = 'TopCenter',
  // ...
}
```

**修改后（camelCase 值）：**
```typescript
export enum Position {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight',
  Center = 'center',
}

export enum TextBackgroundType {
  StretchX = 'stretchX',
  StretchY = 'stretchY',
  Fit = 'fit',
}

export enum ImageFormat {
  Png = 'png',
  Jpg = 'jpg',
  Base64 = 'base64',
}
```

### 3. SerializationOptimizer (`src/SerializationOptimizer.ts`)

**修改：**
```typescript
// 修改前
if (backgroundStyle.type && backgroundStyle.type !== 'Fit') {

// 修改后
if (backgroundStyle.type && backgroundStyle.type !== 'fit') {
```

## 工作原理

### Codegen 处理流程

1. **读取规范文件** (`specs/NativeImageMarker.ts`)
2. **识别字符串字面量联合类型**
3. **生成 C++ 代码**：
   ```cpp
   // 不生成枚举，直接使用字符串
   std::string position = "topLeft";
   ```
4. **JSI 绑定**：字符串值直接传递，无需转换

### 用户使用流程

1. **用户代码**:
   ```typescript
   import { Position } from 'react-native-image-marker';
   
   const options = {
     position: { position: Position.TopLeft }  // 使用枚举
   };
   ```

2. **运行时值**:
   ```javascript
   // Position.TopLeft 的值是 'topLeft'
   { position: { position: 'topLeft' } }
   ```

3. **传递给原生**:
   ```
   JavaScript: 'topLeft' 
   → JSI/Bridge 
   → Native: "topLeft" (匹配原生实现)
   ```

## 影响范围

### 不需要修改的部分

- ✅ **示例应用**：使用枚举常量（如 `Position.TopLeft`），不受影响
- ✅ **iOS 原生代码**：期望 camelCase 字符串，不需要修改
- ✅ **Android 原生代码**：期望 camelCase 字符串，不需要修改
- ✅ **用户代码**：使用枚举常量，不需要修改

### 需要修改的部分

- ✅ **Codegen 规范**：从枚举改为字符串字面量联合类型
- ✅ **TypeScript 类型**：枚举值从 PascalCase 改为 camelCase
- ✅ **SerializationOptimizer**：默认值检查从 `'Fit'` 改为 `'fit'`
- ✅ **测试文件**：更新所有枚举值断言和类型检查逻辑

## 验证方法

### 1. TypeScript 类型检查
```bash
npm run typecheck
```
✅ **状态**: 通过

### 2. 运行测试
```bash
npm test -- --run
```
✅ **状态**: 311 个测试全部通过

### 3. Lint 检查
```bash
npm run lint
```
✅ **状态**: 通过（自动修复格式问题）

### 4. 构建验证
```bash
npm run prepack
```

## 技术参考

- [React Native Codegen 文档](https://reactnative.dev/docs/the-new-architecture/using-codegen)
- [StackOverflow: React Native Fabric/Turbo using enum or type](https://stackoverflow.com/questions/77303972/react-native-fabric-turbo-using-enum-or-type/77512707)
- [TypeScript String Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)

## 总结

通过使用字符串字面量联合类型替代枚举，我们成功解决了 Codegen 编译错误，同时：

1. ✅ 保持了与原生实现的兼容性（camelCase）
2. ✅ 为用户提供了友好的 TypeScript 枚举 API（PascalCase 键）
3. ✅ 避免了 Breaking Change
4. ✅ 不需要修改任何原生代码
5. ✅ 所有测试通过（311/311）
6. ✅ TypeScript 类型检查通过
7. ✅ ESLint 代码规范检查通过

这是一个优雅的解决方案，充分利用了 TypeScript 的类型系统和 React Native Codegen 的灵活性。

## 修复完成状态

**日期**: 2026-02-26

**修改文件**:
- `specs/NativeImageMarker.ts` - 使用字符串字面量联合类型
- `src/types/index.ts` - 枚举值改为 camelCase
- `src/SerializationOptimizer.ts` - 默认值检查更新
- `src/__tests__/properties.test.ts` - 测试逻辑更新

**质量检查结果**:
- ✅ 测试: 311/311 通过
- ✅ TypeScript: 无类型错误
- ✅ ESLint: 无代码规范问题

**CI 构建状态**: 待验证（需要推送到 GitHub 触发 CI）
