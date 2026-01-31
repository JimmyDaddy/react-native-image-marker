# API 参考文档

本文档详细介绍了 `react-native-image-marker` 的完整 API，包括新架构特性和类型定义。

## 目录

- [主要 API](#主要-api)
- [类型定义](#类型定义)
- [架构检测](#架构检测)
- [性能优化](#性能优化)
- [错误处理](#错误处理)

## 主要 API

### ImageMarker 类

主要的图片水印处理类，提供静态方法进行图片处理。

#### `markText<T, S>(options: TextMarkOptions<T, S>): Promise<string>`

在背景图片上添加文本水印。

**泛型参数:**
- `T`: 数值类型 (`number | string`)，用于坐标和尺寸
- `S`: 图片源类型，用于图片资源

**参数:**
- `options`: 文本水印选项

**返回值:**
- `Promise<string>`: 处理后的图片路径或 base64 字符串

**示例:**
```typescript
// 使用数字坐标
const result = await ImageMarker.markText<number, any>({
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { X: 100, Y: 200 }
  }]
});

// 使用百分比坐标
const result2 = await ImageMarker.markText<string, string>({
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: 'Hello World',
    position: { X: '50%', Y: '25%' }
  }]
});
```

#### `markImage<T, S>(options: ImageMarkOptions<T, S>): Promise<string>`

在背景图片上添加图片水印。

**泛型参数:**
- `T`: 数值类型 (`number | string`)，用于坐标和尺寸
- `S`: 图片源类型，用于图片资源

**参数:**
- `options`: 图片水印选项

**返回值:**
- `Promise<string>`: 处理后的图片路径或 base64 字符串

**示例:**
```typescript
const result = await ImageMarker.markImage({
  backgroundImage: { src: require('./bg.jpg') },
  watermarkImages: [{
    src: require('./watermark.png'),
    position: { position: Position.bottomRight },
    scale: 0.5,
    alpha: 0.8
  }]
});
```

#### `isNewArchitecture(): boolean`

检查是否启用了 React Native 新架构。

**返回值:**
- `boolean`: 如果启用新架构返回 `true`，否则返回 `false`

#### `isFabricEnabled(): boolean`

检查是否启用了 Fabric 渲染器。

**返回值:**
- `boolean`: 如果启用 Fabric 返回 `true`，否则返回 `false`

#### `clearImageCache(): void`

清理 Fabric 图片缓存。

#### `getImageCacheStats(): { size: number; keys: string[] }`

获取 Fabric 图片缓存统计信息。

**返回值:**
- `{ size: number; keys: string[] }`: 缓存大小和键列表

## 类型定义

### 基础类型

#### `NumericValue`
```typescript
type NumericValue = number | string;
```

#### `ColorValue`
```typescript
type ColorValue = string;
```

#### `FontName`
```typescript
type FontName = string;
```

#### `ImageSource<T>`
```typescript
type ImageSource<T = any> = T | string | { uri: string } | { data: string };
```

### 枚举类型

#### `Position`
```typescript
enum Position {
  topLeft = 'topLeft',
  topCenter = 'topCenter',
  topRight = 'topRight',
  bottomLeft = 'bottomLeft',
  bottomCenter = 'bottomCenter',
  bottomRight = 'bottomRight',
  center = 'center',
}
```

#### `ImageFormat`
```typescript
enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  base64 = 'base64',
}
```

#### `TextBackgroundType`
```typescript
enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY',
  none = 'fit',
}
```

### 接口类型

#### `PositionOptions<T>`
```typescript
interface PositionOptions<T extends NumericValue = NumericValue> {
  X?: T;
  Y?: T;
  position?: Position;
}
```

#### `TextStyle<T>`
```typescript
interface TextStyle<T extends NumericValue = NumericValue> {
  color?: ColorValue;
  fontName?: FontName;
  fontSize?: number;
  shadowStyle?: ShadowLayerStyle | null;
  textBackgroundStyle?: TextBackgroundStyle<T> | null;
  underline?: boolean;
  skewX?: number;
  strikeThrough?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  italic?: boolean;
  bold?: boolean;
  rotate?: number;
}
```

#### `TextOptions<T>`
```typescript
interface TextOptions<T extends NumericValue = NumericValue> {
  text: string;
  positionOptions?: PositionOptions<T>;
  position?: PositionOptions<T>;
  style?: TextStyle<T>;
}
```

#### `ImageOptions<S>`
```typescript
interface ImageOptions<S = any> {
  src: ImageSource<S>;
  scale?: number;
  rotate?: number;
  alpha?: number;
}
```

#### `TextMarkOptions<T, S>`
```typescript
interface TextMarkOptions<T extends NumericValue = NumericValue, S = any> {
  backgroundImage: ImageOptions<S>;
  watermarkTexts: TextOptions<T>[];
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
}
```

#### `ImageMarkOptions<T, S>`
```typescript
interface ImageMarkOptions<T extends NumericValue = NumericValue, S = any> {
  backgroundImage: ImageOptions<S>;
  watermarkImage?: ImageOptions<S>; // 已弃用
  watermarkPositions?: PositionOptions<T>; // 已弃用
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
  watermarkImages: WatermarkImageOptions<T, S>[];
}
```

### 类型别名

为了方便使用，提供了以下类型别名：

#### 标准类型别名
```typescript
// 数字坐标 + 任意图片源
type StandardTextMarkOptions = TextMarkOptions<number, any>;
type StandardImageMarkOptions = ImageMarkOptions<number, any>;

// 数字坐标 + require() 图片源
type StrictTextMarkOptions = TextMarkOptions<number, number>;
type StrictImageMarkOptions = ImageMarkOptions<number, number>;

// 字符串坐标 + URI 图片源
type URITextMarkOptions = TextMarkOptions<string, string>;
type URIImageMarkOptions = ImageMarkOptions<string, string>;
```

#### 工具类型
```typescript
// 提取背景图片类型
type BackgroundImageType<T extends TextMarkOptions<any, any>> = T['backgroundImage'];

// 提取水印文本类型
type WatermarkTextType<T extends TextMarkOptions<any, any>> = T['watermarkTexts'][0];

// 推断数值类型
type InferNumericType<T> = T extends TextMarkOptions<infer N, any> ? N : NumericValue;

// 推断源类型
type InferSourceType<T> = T extends TextMarkOptions<any, infer S> ? S : any;
```

## 架构检测

### ArchitectureDetector 类

提供 React Native 架构检测功能。

#### `isNewArchitecture(): boolean`

检查是否启用新架构。

#### `hasTurboModules(): boolean`

检查是否支持 TurboModules。

#### `hasJSI(): boolean`

检查是否支持 JSI。

#### `hasFabric(): boolean`

检查是否支持 Fabric。

#### `getArchitectureInfo(): ArchitectureInfo`

获取完整的架构信息。

```typescript
interface ArchitectureInfo {
  isNewArchitecture: boolean;
  hasTurboModules: boolean;
  hasJSI: boolean;
  hasFabric: boolean;
}
```

#### `reset(): void`

重置架构检测缓存（主要用于测试）。

**示例:**
```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// 检测新架构
const isNewArch = ArchitectureDetector.isNewArchitecture();

// 获取详细信息
const info = ArchitectureDetector.getArchitectureInfo();
console.log('架构信息:', info);

// 重置检测（测试时使用）
ArchitectureDetector.reset();
```

## 性能优化

### SerializationOptimizer 类

提供数据序列化优化功能（新架构自动使用）。

#### `optimizeTextMarkOptions(options: any): any`

优化文本水印选项。

#### `optimizeImageMarkOptions(options: any): any`

优化图片水印选项。

**示例:**
```typescript
import { SerializationOptimizer } from 'react-native-image-marker';

// 手动优化（通常不需要）
const optimized = SerializationOptimizer.optimizeTextMarkOptions({
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{
    text: 'Test',
    position: { X: undefined, Y: 100 }, // undefined 会被移除
  }],
  quality: 90, // 默认值会被优化
});
```

### FabricImageLoader 类

提供 Fabric 图片加载功能。

#### `isFabricEnabled(): boolean`

检查 Fabric 是否启用。

#### `loadImage(source: any, options?: any): Promise<any>`

加载图片（内部使用）。

#### `clearCache(): void`

清理图片缓存。

#### `getCacheStats(): { size: number; keys: string[] }`

获取缓存统计信息。

**示例:**
```typescript
import { FabricImageLoader } from 'react-native-image-marker';

// 检查 Fabric 状态
const isFabric = FabricImageLoader.isFabricEnabled();

// 管理缓存
FabricImageLoader.clearCache();
const stats = FabricImageLoader.getCacheStats();
```

## 错误处理

### ErrorHandler 类

提供统一的错误处理功能。

#### `normalizeError(error: any, context: string): Error`

标准化错误对象。

#### `validateInput(options: any, method: string): void`

验证输入参数。

#### `wrapAsyncOperation<T>(operation: () => Promise<T>, context: string): Promise<T>`

包装异步操作。

#### `handleArchitectureDetectionError(error: any): boolean`

处理架构检测错误。

#### `handleTurboModuleLoadError(error: any): Error`

处理 TurboModule 加载错误。

**示例:**
```typescript
import { ErrorHandler } from 'react-native-image-marker';

try {
  const result = await ImageMarker.markText(options);
} catch (error) {
  const normalizedError = ErrorHandler.normalizeError(error, 'markText');
  console.error('处理失败:', normalizedError.message);
}
```

## 使用示例

### 基础用法

```typescript
import ImageMarker, { Position, ImageFormat } from 'react-native-image-marker';

const result = await ImageMarker.markText({
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { position: Position.center },
    style: {
      fontSize: 20,
      color: '#FFFFFF',
      bold: true
    }
  }],
  quality: 90,
  saveFormat: ImageFormat.png
});
```

### 高级用法（新架构）

```typescript
import ImageMarker, { 
  type StandardTextMarkOptions,
  ArchitectureDetector,
  FabricImageLoader 
} from 'react-native-image-marker';

// 检查架构
const isNewArch = ArchitectureDetector.isNewArchitecture();
console.log('使用新架构:', isNewArch);

// 类型安全的选项
const options: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Type Safe',
    position: { X: 100, Y: 200 },
    style: {
      fontSize: 24,
      color: '#FF0000',
      textBackgroundStyle: {
        color: '#FFFFFF',
        padding: 10,
        cornerRadius: {
          all: { x: 5, y: 5 }
        }
      }
    }
  }]
};

const result = await ImageMarker.markText(options);

// 管理缓存
if (FabricImageLoader.isFabricEnabled()) {
  const stats = ImageMarker.getImageCacheStats();
  if (stats.size > 50) {
    ImageMarker.clearImageCache();
  }
}
```

### 错误处理

```typescript
import ImageMarker, { ErrorHandler } from 'react-native-image-marker';

async function processImage(options: any) {
  try {
    // 验证输入
    ErrorHandler.validateInput(options, 'markText');
    
    // 处理图片
    const result = await ImageMarker.markText(options);
    return result;
  } catch (error) {
    // 标准化错误
    const normalizedError = ErrorHandler.normalizeError(error, 'processImage');
    console.error('图片处理失败:', normalizedError.message);
    throw normalizedError;
  }
}
```

这个 API 参考文档涵盖了所有主要功能和类型定义，为开发者提供了完整的使用指南。