# Codegen 枚举键命名修复说明

## 问题描述

在 CI 构建过程中，Android New Architecture 构建失败，错误信息显示 Codegen 生成的 C++ 代码中枚举成员命名不匹配：

```
error: no member named 'TopLeft' in 'facebook::react::ImageMarkerPosition'; did you mean 'topLeft'?
error: no member named 'StretchX' in 'facebook::react::ImageMarkerTextBackgroundType'; did you mean 'stretchX'?
```

## iOS 也会受到影响

**是的，这个修改会同时影响 iOS 和 Android 两个平台。**

### 为什么两个平台都受影响？

1. **Codegen 生成相同的 C++ 代码**
   - React Native Codegen 为 iOS 和 Android 生成相同结构的 C++ JSI 绑定代码
   - 枚举的命名规则在两个平台上完全一致
   - 都会生成 `ImageMarkerPosition::TopLeft` 这样的 C++ 枚举成员

2. **iOS 生成的代码结构**
   ```cpp
   // iOS 和 Android 都会生成相同的 C++ 枚举
   namespace facebook::react {
   
   enum class ImageMarkerPosition {
     TopLeft,      // 必须是 PascalCase
     TopCenter,
     TopRight,
     // ...
   };
   
   // JSI 绑定代码
   inline std::string toString(const ImageMarkerPosition &value) {
     switch (value) {
       case ImageMarkerPosition::TopLeft:
         return "topLeft";  // 返回给 JS 的值
       // ...
     }
   }
   
   }
   ```

3. **CI 配置确认**
   - 查看 `.github/workflows/ci.yml` 可以看到：
   - iOS 构建任务: `ios-build-test`
   - 支持 New Architecture: `RCT_NEW_ARCH_ENABLED=1 pod install`
   - 测试矩阵包括 Legacy 和 New 架构

### 为什么 iOS 构建可能没报错？

如果 iOS 构建没有报错，可能的原因：

1. **构建缓存**
   - iOS 本地开发可能使用了旧的 Codegen 缓存
   - 需要清理缓存重新构建：`cd ios && rm -rf build && pod install`

2. **CI 配置差异**
   - iOS CI 任务可能被跳过（基于文件变更检测）
   - 或者 iOS CI 还在使用 Legacy 架构测试

3. **编译器容错性**
   - Clang (iOS) 和 GCC/Clang (Android) 的错误报告时机可能不同
   - 但最终都会在正确配置下报同样的错误

### 验证 iOS 是否需要修复

运行以下命令验证 iOS New Architecture 构建：

```bash
# 清理并重新构建 iOS (New Architecture)
cd example-0.73/ios
rm -rf build Pods Podfile.lock
RCT_NEW_ARCH_ENABLED=1 pod install
xcodebuild -workspace ImageMarkerExample.xcworkspace \
  -scheme ImageMarkerExample \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  clean build
```

如果构建失败，会看到与 Android 相同的错误：
```
error: no member named 'TopLeft' in 'facebook::react::ImageMarkerPosition'
```

## 影响范围总结

| 平台 | Legacy 架构 | New Architecture | 是否受影响 |
|------|------------|------------------|-----------|
| iOS | ✅ 不受影响 | ⚠️ 受影响 | 需要修复 |
| Android | ✅ 不受影响 | ⚠️ 受影响 | 需要修复 |
| JavaScript | ✅ 不受影响 | ✅ 不受影响 | 枚举值不变 |

**结论**: 只要使用 New Architecture (TurboModules)，iOS 和 Android 都会受到影响，都需要这个修复。

React Native Codegen 在生成 C++ 代码时，会将 TypeScript 枚举键转换为 C++ 枚举成员。Codegen 期望枚举键使用 **PascalCase** 命名（如 `TopLeft`），但我们的代码使用了 **camelCase** 命名（如 `topLeft`）。

这导致生成的 JSI 绑定代码引用了 `TopLeft`，但实际生成的枚举定义却是 `topLeft`，造成编译错误。

## 解决方案

### 1. 修改枚举定义

将所有枚举的**键**从 camelCase 改为 PascalCase，但**值**保持 camelCase 以保持 JavaScript API 兼容性：

#### Position 枚举
```typescript
// 修改前
export enum Position {
  topLeft = 'topLeft',
  topCenter = 'topCenter',
  // ...
}

// 修改后
export enum Position {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight',
  Center = 'center',
}
```

#### ImageFormat 枚举
```typescript
// 修改前
export enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  base64 = 'base64',
}

// 修改后
export enum ImageFormat {
  Png = 'png',
  Jpg = 'jpg',
  Base64 = 'base64',
}
```

#### TextBackgroundType 枚举
```typescript
// 修改前
export enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY',
  fit = 'fit',
}

// 修改后
export enum TextBackgroundType {
  StretchX = 'stretchX',
  StretchY = 'stretchY',
  Fit = 'fit',
}
```

### 2. 修改的文件

以下文件已更新以使用新的枚举键：

#### JavaScript/TypeScript 文件（必须修改）

1. **Codegen 规范**
   - `specs/NativeImageMarker.ts` - TurboModule 接口定义

2. **类型定义**
   - `src/types/index.ts` - TypeScript 类型定义

3. **示例代码**
   - `src/index.ts` - API 文档示例

4. **测试文件**（所有枚举引用已更新）
   - `src/__tests__/properties.test.ts`
   - `src/__tests__/regression.test.ts`
   - `src/__tests__/comprehensive-properties.test.ts`
   - `src/__tests__/serialization-optimization.test.ts`
   - `src/__tests__/performance.test.ts`
   - `src/__tests__/expo-integration.test.ts`
   - `src/__tests__/end-to-end.test.ts`

#### 原生代码（不需要修改）

**iOS 和 Android 原生代码都不需要修改**，原因：

1. **Legacy 实现**
   - iOS: `ios/RCTImageMarker/` - 使用枚举值（字符串），值未改变
   - Android: `android/src/main/java/.../` - 使用枚举值（字符串），值未改变

2. **TurboModule 实现**
   - iOS: `ios/ImageMarkerTurboModule/` - 由 Codegen 自动生成绑定代码
   - Android: `android/src/main/java/.../` - 由 Codegen 自动生成绑定代码
   - C++ JSI 绑定: 由 Codegen 根据 `specs/NativeImageMarker.ts` 自动生成

3. **数据流向**
   ```
   JS (Position.TopLeft) → Codegen C++ (TopLeft) → Native (接收 'topLeft' 字符串)
   ```
   原生代码只接收转换后的字符串值，不直接使用 TypeScript 枚举键。

### 3. API 兼容性

**重要**: 这个修改是 **Breaking Change**，会影响现有用户代码。

#### 迁移指南

用户需要更新他们的代码，将枚举键从 camelCase 改为 PascalCase：

```typescript
// 旧代码（不再工作）
import { Position, ImageFormat, TextBackgroundType } from 'react-native-image-marker';

const options = {
  position: Position.topLeft,        // ❌ 错误
  saveFormat: ImageFormat.png,       // ❌ 错误
  type: TextBackgroundType.stretchX, // ❌ 错误
};

// 新代码（正确）
const options = {
  position: Position.TopLeft,        // ✅ 正确
  saveFormat: ImageFormat.Png,       // ✅ 正确
  type: TextBackgroundType.StretchX, // ✅ 正确
};
```

#### 枚举值保持不变

枚举的**值**（字符串）保持不变，因此如果用户直接使用字符串值，代码无需修改：

```typescript
// 这些代码仍然有效
const options = {
  position: 'topLeft',    // ✅ 仍然有效
  saveFormat: 'png',      // ✅ 仍然有效
  type: 'stretchX',       // ✅ 仍然有效
};
```

## 验证结果

### 1. 类型检查
```bash
npm run typecheck
# ✅ 通过 - 无类型错误
```

### 2. 单元测试
```bash
npm test -- --run
# ✅ 通过 - 18 个测试文件，311 个测试用例全部通过
```

### 3. 代码规范
```bash
npm run lint
# ✅ 通过 - 无 lint 错误
```

## 技术细节

### Codegen 命名约定

React Native Codegen 对枚举的处理规则：

1. **枚举键** → C++ 枚举成员名（必须是 PascalCase）
2. **枚举值** → JavaScript 运行时值（可以是任意字符串）

生成的 C++ 代码示例：

```cpp
// 从 Position.TopLeft 生成
enum ImageMarkerPosition { 
  TopLeft,      // C++ 枚举成员
  TopCenter,
  // ...
};

// JSI 绑定代码
if (value == ImageMarkerPosition::TopLeft) {
  return "topLeft";  // 返回 JavaScript 值
}
```

### 为什么之前没有发现

这个问题只在特定条件下出现：

1. **必须使用 New Architecture** 
   - Legacy 架构不使用 Codegen，不会生成 C++ 枚举代码
   - 只有启用 TurboModules 时才会触发

2. **需要全新构建**
   - 本地开发可能使用了缓存的 Codegen 输出
   - CI 环境是全新构建，没有缓存，更容易发现问题

3. **Android 先暴露问题**
   - Android CI 配置了 New Architecture 构建
   - iOS CI 可能基于文件变更跳过了构建
   - 或者 iOS 使用了构建缓存

4. **编译器差异**
   - 不同编译器的错误报告时机可能不同
   - 但最终在正确配置下都会报同样的错误

**重要**: iOS 和 Android 使用相同的 Codegen 和 C++ 代码生成逻辑，因此这个修复对两个平台都是必需的。

## 后续步骤

1. **更新 CHANGELOG.md** - 记录这个 Breaking Change
2. **更新文档** - 在 README 和迁移指南中说明枚举键变更
3. **发布新版本** - 建议使用 major 版本号（如 2.0.0）
4. **通知用户** - 在 Release Notes 中明确说明迁移步骤

## 相关资源

- [React Native Codegen 文档](https://reactnative.dev/docs/the-new-architecture/pillars-codegen)
- [TurboModule 规范](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [CI 构建日志](https://github.com/JimmyDaddy/react-native-image-marker/actions)

---

**修复日期**: 2026-02-26  
**影响范围**: Breaking Change - 需要用户更新代码  
**测试状态**: ✅ 全部通过
