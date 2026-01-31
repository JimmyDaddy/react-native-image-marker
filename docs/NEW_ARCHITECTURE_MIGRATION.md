# React Native 新架构迁移指南

本指南将帮助您将 `react-native-image-marker` 从传统桥接架构迁移到 React Native 新架构（TurboModules + Fabric）。

## 目录

- [概述](#概述)
- [新架构优势](#新架构优势)
- [兼容性](#兼容性)
- [迁移步骤](#迁移步骤)
- [配置说明](#配置说明)
- [API 变更](#api-变更)
- [性能优化](#性能优化)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 概述

React Native 新架构引入了两个主要组件：

- **TurboModules**: 新的原生模块系统，提供更好的性能和类型安全
- **Fabric**: 新的渲染系统，提供更好的用户界面性能

`react-native-image-marker` v1.2.0+ 完全支持新架构，同时保持与传统架构的向后兼容性。

## 新架构优势

### 性能改进
- **更快的启动时间**: TurboModules 按需加载，减少应用启动时间
- **更低的内存占用**: 优化的序列化和通信机制
- **更好的并发性能**: JSI 直接通信，减少桥接开销

### 开发体验
- **完整的 TypeScript 支持**: 自动生成的类型定义
- **更好的错误处理**: 统一的错误格式和更详细的错误信息
- **架构检测**: 自动检测并选择最佳实现

### 类型安全
- **泛型支持**: 完整的泛型类型系统
- **编译时检查**: TypeScript 编译器验证参数类型
- **智能提示**: 更好的 IDE 支持和代码补全

## 兼容性

| React Native 版本 | 新架构支持 | 推荐版本 |
|-------------------|-----------|----------|
| >= 0.74.0         | ✅ 完全支持 | v1.2.0+ |
| >= 0.73.0         | ✅ 完全支持 | v1.2.0+ |
| >= 0.72.0         | ⚠️ 实验性   | v1.2.0+ |
| < 0.72.0          | ❌ 不支持   | v1.1.x  |

## 迁移步骤

### 1. 更新依赖

```bash
# 更新到最新版本
npm install react-native-image-marker@latest

# 或使用 yarn
yarn add react-native-image-marker@latest
```

### 2. 启用新架构

#### iOS 配置

在 `ios/Podfile` 中启用新架构：

```ruby
# 启用新架构
ENV['RCT_NEW_ARCH_ENABLED'] = '1'

# 或者在构建时设置
# RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
```

#### Android 配置

在 `android/gradle.properties` 中启用新架构：

```properties
# 启用新架构
newArchEnabled=true

# 启用 Hermes（推荐）
hermesEnabled=true
```

### 3. 重新构建项目

```bash
# iOS
cd ios && RCT_NEW_ARCH_ENABLED=1 bundle exec pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

### 4. 验证迁移

使用架构检测 API 验证新架构是否正常工作：

```typescript
import ImageMarker from 'react-native-image-marker';

// 检查是否启用新架构
const isNewArch = ImageMarker.isNewArchitecture();
console.log('新架构已启用:', isNewArch);

// 检查 Fabric 是否可用
const isFabric = ImageMarker.isFabricEnabled();
console.log('Fabric 已启用:', isFabric);

// 获取架构信息
import { ArchitectureDetector } from 'react-native-image-marker';
const info = ArchitectureDetector.getArchitectureInfo();
console.log('架构信息:', info);
```

## 配置说明

### TypeScript 配置

确保您的 `tsconfig.json` 支持新架构：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "src/**/*",
    "node_modules/react-native-image-marker/lib/typescript/**/*"
  ]
}
```

### Metro 配置

如果使用自定义 Metro 配置，确保支持新架构：

```javascript
// metro.config.js
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();
  
  return {
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
    },
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
  };
})();
```

## API 变更

### 向后兼容性

所有现有 API 保持完全兼容，无需修改现有代码：

```typescript
// 现有代码继续工作
import ImageMarker, { Position, ImageFormat } from 'react-native-image-marker';

const result = await ImageMarker.markText({
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { position: Position.center }
  }]
});
```

### 新增功能

#### 泛型类型支持

```typescript
import ImageMarker, { 
  type StandardTextMarkOptions,
  type StrictTextMarkOptions,
  type URITextMarkOptions 
} from 'react-native-image-marker';

// 标准选项（数字坐标 + 任意图片源）
const standardOptions: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Standard',
    position: { X: 100, Y: 200 }
  }]
};

// 严格选项（数字坐标 + require() 图片源）
const strictOptions: StrictTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Strict',
    position: { X: 100, Y: 200 }
  }]
};

// URI 选项（字符串坐标 + URI 图片源）
const uriOptions: URITextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: 'URI',
    position: { X: '50%', Y: '25%' }
  }]
};
```

#### 架构检测 API

```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// 检测新架构
const isNewArch = ArchitectureDetector.isNewArchitecture();

// 检测 TurboModules
const hasTurboModules = ArchitectureDetector.hasTurboModules();

// 检测 JSI
const hasJSI = ArchitectureDetector.hasJSI();

// 检测 Fabric
const hasFabric = ArchitectureDetector.hasFabric();

// 获取完整信息
const info = ArchitectureDetector.getArchitectureInfo();
```

#### Fabric 图片加载

```typescript
import { FabricImageLoader } from 'react-native-image-marker';

// 检查 Fabric 是否启用
const isFabricEnabled = FabricImageLoader.isFabricEnabled();

// 清理图片缓存
FabricImageLoader.clearCache();

// 获取缓存统计
const stats = FabricImageLoader.getCacheStats();
console.log(`缓存大小: ${stats.size}, 缓存键: ${stats.keys.length}`);
```

## 性能优化

### 序列化优化

新架构自动优化数据序列化：

```typescript
import { SerializationOptimizer } from 'react-native-image-marker';

// 手动优化选项（通常不需要）
const optimizedOptions = SerializationOptimizer.optimizeTextMarkOptions({
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{
    text: 'Test',
    position: { X: undefined, Y: 100 }, // undefined 值会被移除
    style: {
      padding: 10,
      paddingLeft: 10, // 重复值会被合并
    }
  }],
  quality: 90, // 默认值会被移除
});
```

### 内存管理

```typescript
// 定期清理缓存
setInterval(() => {
  ImageMarker.clearImageCache();
}, 60000); // 每分钟清理一次

// 监控内存使用
const stats = ImageMarker.getImageCacheStats();
if (stats.size > 100) { // 如果缓存过大
  ImageMarker.clearImageCache();
}
```

### 并发处理

```typescript
// 新架构支持更好的并发处理
const promises = [
  ImageMarker.markText(options1),
  ImageMarker.markText(options2),
  ImageMarker.markText(options3),
];

const results = await Promise.all(promises);
```

## 故障排除

### 常见问题

#### 1. 新架构检测失败

```typescript
// 检查架构检测
import { ArchitectureDetector } from 'react-native-image-marker';

try {
  const isNewArch = ArchitectureDetector.isNewArchitecture();
  console.log('新架构状态:', isNewArch);
} catch (error) {
  console.error('架构检测失败:', error);
  // 会自动回退到传统架构
}
```

#### 2. TurboModule 加载失败

```typescript
// 检查 TurboModule 可用性
import { ArchitectureDetector } from 'react-native-image-marker';

const info = ArchitectureDetector.getArchitectureInfo();
if (!info.hasTurboModules) {
  console.warn('TurboModules 不可用，使用传统桥接');
}
```

#### 3. 类型错误

```typescript
// 确保导入正确的类型
import ImageMarker, { 
  type TextMarkOptions,
  type ImageMarkOptions,
  Position,
  ImageFormat 
} from 'react-native-image-marker';

// 使用明确的类型注解
const options: TextMarkOptions = {
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{ text: 'Test' }]
};
```

### 调试技巧

#### 启用详细日志

```typescript
// 在开发模式下启用详细日志
if (__DEV__) {
  import { ErrorHandler } from 'react-native-image-marker';
  
  // 设置错误处理器
  ErrorHandler.setDebugMode(true);
}
```

#### 性能监控

```typescript
// 监控性能
const startTime = Date.now();
const result = await ImageMarker.markText(options);
const endTime = Date.now();
console.log(`处理时间: ${endTime - startTime}ms`);
```

### 构建问题

#### iOS 构建失败

```bash
# 清理并重新安装 Pods
cd ios
rm -rf Pods Podfile.lock
RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
cd ..
```

#### Android 构建失败

```bash
# 清理 Android 构建
cd android
./gradlew clean
cd ..

# 重新构建
npx react-native run-android
```

## 最佳实践

### 1. 渐进式迁移

```typescript
// 使用架构检测进行渐进式迁移
import { ArchitectureDetector } from 'react-native-image-marker';

const useOptimizedFeatures = ArchitectureDetector.isNewArchitecture();

if (useOptimizedFeatures) {
  // 使用新架构特性
  const result = await ImageMarker.markText(complexOptions);
} else {
  // 使用简化选项确保兼容性
  const result = await ImageMarker.markText(simpleOptions);
}
```

### 2. 错误处理

```typescript
import { ErrorHandler } from 'react-native-image-marker';

try {
  const result = await ImageMarker.markText(options);
  return result;
} catch (error) {
  // 统一的错误处理
  const normalizedError = ErrorHandler.normalizeError(error, 'markText');
  console.error('图片处理失败:', normalizedError.message);
  throw normalizedError;
}
```

### 3. 类型安全

```typescript
// 使用严格的类型定义
import type { 
  StandardTextMarkOptions,
  StandardImageMarkOptions 
} from 'react-native-image-marker';

// 定义类型安全的工具函数
function createTextWatermark(
  text: string,
  position: { X: number; Y: number }
): StandardTextMarkOptions {
  return {
    backgroundImage: { src: require('./default-bg.jpg') },
    watermarkTexts: [{
      text,
      position,
      style: {
        fontSize: 20,
        color: '#FFFFFF'
      }
    }]
  };
}
```

### 4. 性能优化

```typescript
// 使用缓存和批处理
const imageCache = new Map<string, string>();

async function processImageWithCache(
  options: StandardTextMarkOptions,
  cacheKey: string
): Promise<string> {
  // 检查缓存
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  
  // 处理图片
  const result = await ImageMarker.markText(options);
  
  // 缓存结果
  imageCache.set(cacheKey, result);
  
  return result;
}
```

### 5. 测试策略

```typescript
// 测试两种架构
import { ArchitectureDetector } from 'react-native-image-marker';

describe('ImageMarker', () => {
  beforeEach(() => {
    // 重置架构检测
    ArchitectureDetector.reset();
  });
  
  it('should work with both architectures', async () => {
    const options = createTestOptions();
    
    // 测试当前架构
    const result = await ImageMarker.markText(options);
    expect(typeof result).toBe('string');
    
    // 验证架构信息
    const info = ArchitectureDetector.getArchitectureInfo();
    console.log('测试架构:', info);
  });
});
```

## 总结

React Native 新架构为 `react-native-image-marker` 带来了显著的性能改进和更好的开发体验。通过遵循本指南，您可以：

1. **无缝迁移**: 保持现有代码不变的同时获得新架构的好处
2. **提升性能**: 利用 TurboModules 和 JSI 的性能优势
3. **增强类型安全**: 使用完整的 TypeScript 支持和泛型类型
4. **优化开发体验**: 获得更好的错误处理和调试支持

如果您在迁移过程中遇到任何问题，请查看[故障排除](#故障排除)部分或在 GitHub 上提交 issue。