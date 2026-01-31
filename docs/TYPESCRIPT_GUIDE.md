# TypeScript 使用指南

本指南详细介绍如何在 TypeScript 项目中使用 `react-native-image-marker` 的类型安全功能。

## 目录

- [基础类型使用](#基础类型使用)
- [泛型类型系统](#泛型类型系统)
- [类型别名](#类型别名)
- [高级类型模式](#高级类型模式)
- [类型安全最佳实践](#类型安全最佳实践)
- [常见类型错误](#常见类型错误)

## 基础类型使用

### 导入类型

```typescript
// 导入主要 API 和类型
import ImageMarker, {
  // 枚举类型
  Position,
  ImageFormat,
  TextBackgroundType,
  
  // 接口类型
  type TextMarkOptions,
  type ImageMarkOptions,
  type TextStyle,
  type ImageOptions,
  
  // 类型别名
  type StandardTextMarkOptions,
  type StandardImageMarkOptions,
  type StrictTextMarkOptions,
  type URITextMarkOptions,
  
  // 工具类
  ArchitectureDetector,
  FabricImageLoader,
  ErrorHandler
} from 'react-native-image-marker';
```

### 基本使用

```typescript
// 使用默认类型（推荐）
const basicOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { position: Position.center },
    style: {
      fontSize: 20,
      color: '#FFFFFF'
    }
  }]
};

const result = await ImageMarker.markText(basicOptions);
```

## 泛型类型系统

### 数值类型泛型

控制坐标和尺寸的类型：

```typescript
// 数字坐标
const numberOptions: TextMarkOptions<number> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Number Coordinates',
    position: { X: 100, Y: 200 }, // 必须是数字
    style: {
      fontSize: 24,
      textBackgroundStyle: {
        padding: 10, // 必须是数字
        cornerRadius: {
          all: { x: 5, y: 5 } // 必须是数字
        }
      }
    }
  }]
};

// 字符串坐标（支持百分比）
const stringOptions: TextMarkOptions<string> = {
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: 'String Coordinates',
    position: { X: '50%', Y: '25%' }, // 可以是百分比
    style: {
      fontSize: 24,
      textBackgroundStyle: {
        padding: '5%', // 可以是百分比
        cornerRadius: {
          all: { x: '10px', y: '10px' } // 可以是字符串
        }
      }
    }
  }]
};

// 混合类型（数字和字符串）
const mixedOptions: TextMarkOptions<number | string> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Mixed Coordinates',
    position: { X: 100, Y: '50%' }, // 混合使用
    style: {
      fontSize: 24,
      textBackgroundStyle: {
        padding: 10,
        paddingTop: '5%' // 混合使用
      }
    }
  }]
};
```

### 图片源类型泛型

控制图片源的类型：

```typescript
// require() 图片源
const requireOptions: TextMarkOptions<number, number> = {
  backgroundImage: { src: require('./bg.jpg') }, // 必须是 require()
  watermarkTexts: [{
    text: 'Require Source',
    position: { X: 100, Y: 200 }
  }]
};

// URI 图片源
const uriOptions: TextMarkOptions<string, string> = {
  backgroundImage: { src: 'https://example.com/bg.jpg' }, // 必须是字符串 URI
  watermarkTexts: [{
    text: 'URI Source',
    position: { X: '50%', Y: '25%' }
  }]
};

// 任意图片源
const anyOptions: TextMarkOptions<number, any> = {
  backgroundImage: { 
    src: require('./bg.jpg') // 可以是任意类型
    // 或 src: 'https://example.com/bg.jpg'
    // 或 src: { uri: 'https://example.com/bg.jpg' }
    // 或 src: { data: 'base64string' }
  },
  watermarkTexts: [{
    text: 'Any Source',
    position: { X: 100, Y: 200 }
  }]
};
```

## 类型别名

为了简化使用，提供了预定义的类型别名：

### 标准类型别名

```typescript
// 最常用的组合
type StandardTextMarkOptions = TextMarkOptions<number, any>;
type StandardImageMarkOptions = ImageMarkOptions<number, any>;

const standardOptions: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Standard',
    position: { X: 100, Y: 200 } // 数字坐标
  }]
};
```

### 严格类型别名

```typescript
// 严格的类型约束
type StrictTextMarkOptions = TextMarkOptions<number, number>;
type StrictImageMarkOptions = ImageMarkOptions<number, number>;

const strictOptions: StrictTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') }, // 必须是 require()
  watermarkTexts: [{
    text: 'Strict',
    position: { X: 100, Y: 200 } // 必须是数字
  }]
};
```

### URI 类型别名

```typescript
// URI 和百分比坐标
type URITextMarkOptions = TextMarkOptions<string, string>;
type URIImageMarkOptions = ImageMarkOptions<string, string>;

const uriOptions: URITextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' }, // 必须是字符串 URI
  watermarkTexts: [{
    text: 'URI',
    position: { X: '50%', Y: '25%' } // 可以是百分比
  }]
};
```

## 高级类型模式

### 条件类型

```typescript
// 根据输入类型推断输出类型
type InferNumericType<T> = T extends TextMarkOptions<infer N, any> ? N : number;
type InferSourceType<T> = T extends TextMarkOptions<any, infer S> ? S : any;

// 使用示例
type MyOptionsType = TextMarkOptions<string, number>;
type MyNumericType = InferNumericType<MyOptionsType>; // string
type MySourceType = InferSourceType<MyOptionsType>; // number
```

### 工具类型

```typescript
// 提取特定部分的类型
type BackgroundImageType<T extends TextMarkOptions<any, any>> = T['backgroundImage'];
type WatermarkTextType<T extends TextMarkOptions<any, any>> = T['watermarkTexts'][0];

// 使用示例
type MyOptions = StandardTextMarkOptions;
type MyBackgroundImage = BackgroundImageType<MyOptions>; // ImageOptions<any>
type MyWatermarkText = WatermarkTextType<MyOptions>; // TextOptions<number>
```

### 映射类型

```typescript
// 创建可选版本的类型
type PartialTextMarkOptions<T extends NumericValue = number, S = any> = {
  [K in keyof TextMarkOptions<T, S>]?: TextMarkOptions<T, S>[K];
};

// 创建只读版本的类型
type ReadonlyTextMarkOptions<T extends NumericValue = number, S = any> = {
  readonly [K in keyof TextMarkOptions<T, S>]: TextMarkOptions<T, S>[K];
};
```

## 类型安全最佳实践

### 1. 使用类型别名

```typescript
// 好的做法：使用预定义的类型别名
const options: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Hello' }]
};

// 避免：直接使用复杂的泛型类型
const options2: TextMarkOptions<number, any> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Hello' }]
};
```

### 2. 创建类型安全的工具函数

```typescript
// 创建类型安全的构建器函数
function createTextWatermark(
  text: string,
  position: { X: number; Y: number },
  style?: Partial<TextStyle<number>>
): StandardTextMarkOptions {
  return {
    backgroundImage: { src: require('./default-bg.jpg') },
    watermarkTexts: [{
      text,
      position,
      style: {
        fontSize: 20,
        color: '#FFFFFF',
        ...style
      }
    }]
  };
}

// 使用
const watermark = createTextWatermark('Hello', { X: 100, Y: 200 }, {
  bold: true,
  fontSize: 24
});
```

### 3. 使用类型守卫

```typescript
// 类型守卫函数
function isStandardOptions(options: any): options is StandardTextMarkOptions {
  return options && 
         options.backgroundImage && 
         Array.isArray(options.watermarkTexts);
}

function isURIOptions(options: any): options is URITextMarkOptions {
  return options && 
         options.backgroundImage && 
         typeof options.backgroundImage.src === 'string' &&
         options.backgroundImage.src.startsWith('http');
}

// 使用类型守卫
function processOptions(options: unknown) {
  if (isStandardOptions(options)) {
    // TypeScript 知道这里 options 是 StandardTextMarkOptions
    return ImageMarker.markText(options);
  } else if (isURIOptions(options)) {
    // TypeScript 知道这里 options 是 URITextMarkOptions
    return ImageMarker.markText(options);
  } else {
    throw new Error('Invalid options');
  }
}
```

### 4. 使用泛型约束

```typescript
// 约束泛型参数
function createWatermarkWithConstraints<
  T extends NumericValue,
  S extends string | number
>(
  backgroundSrc: ImageSource<S>,
  text: string,
  position: PositionOptions<T>
): TextMarkOptions<T, S> {
  return {
    backgroundImage: { src: backgroundSrc },
    watermarkTexts: [{
      text,
      position
    }]
  };
}

// 使用
const numberWatermark = createWatermarkWithConstraints(
  require('./bg.jpg'), // S 推断为 number
  'Hello',
  { X: 100, Y: 200 } // T 推断为 number
);

const stringWatermark = createWatermarkWithConstraints(
  'https://example.com/bg.jpg', // S 推断为 string
  'Hello',
  { X: '50%', Y: '25%' } // T 推断为 string
);
```

### 5. 错误处理的类型安全

```typescript
// 类型安全的错误处理
async function safeMarkText(
  options: StandardTextMarkOptions
): Promise<{ success: true; result: string } | { success: false; error: Error }> {
  try {
    const result = await ImageMarker.markText(options);
    return { success: true, result };
  } catch (error) {
    const normalizedError = ErrorHandler.normalizeError(error, 'markText');
    return { success: false, error: normalizedError };
  }
}

// 使用
const result = await safeMarkText(options);
if (result.success) {
  console.log('成功:', result.result); // TypeScript 知道这里有 result 属性
} else {
  console.error('失败:', result.error.message); // TypeScript 知道这里有 error 属性
}
```

## 常见类型错误

### 1. 坐标类型不匹配

```typescript
// ❌ 错误：混合使用数字和字符串类型
const badOptions: TextMarkOptions<number> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Bad',
    position: { X: 100, Y: '50%' } // 错误：Y 应该是 number
  }]
};

// ✅ 正确：使用联合类型
const goodOptions: TextMarkOptions<number | string> = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Good',
    position: { X: 100, Y: '50%' } // 正确：支持混合类型
  }]
};
```

### 2. 图片源类型不匹配

```typescript
// ❌ 错误：图片源类型不匹配
const badOptions: StrictTextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' }, // 错误：应该是 require()
  watermarkTexts: [{ text: 'Bad' }]
};

// ✅ 正确：使用正确的图片源类型
const goodOptions: StrictTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') }, // 正确：使用 require()
  watermarkTexts: [{ text: 'Good' }]
};
```

### 3. 缺少必需属性

```typescript
// ❌ 错误：缺少必需的属性
const badOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  // 错误：缺少 watermarkTexts
};

// ✅ 正确：包含所有必需属性
const goodOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Good' }] // 正确：包含必需属性
};
```

### 4. 类型断言的误用

```typescript
// ❌ 错误：不安全的类型断言
const unsafeOptions = {
  backgroundImage: { src: 'invalid' },
  // 缺少 watermarkTexts
} as TextMarkOptions; // 危险：绕过了类型检查

// ✅ 正确：使用类型守卫或正确的类型定义
const safeOptions: TextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{ text: 'Safe' }]
};
```

### 5. 泛型参数推断错误

```typescript
// ❌ 错误：泛型参数推断不正确
function badFunction<T>(options: TextMarkOptions<T>) {
  // 错误：T 的类型无法正确推断
  return options;
}

// ✅ 正确：提供默认泛型参数或约束
function goodFunction<T extends NumericValue = number>(
  options: TextMarkOptions<T>
): TextMarkOptions<T> {
  return options;
}
```

## 调试类型问题

### 使用 TypeScript 编译器

```bash
# 检查类型错误
npx tsc --noEmit

# 查看类型推断
npx tsc --noEmit --pretty
```

### 使用 IDE 功能

```typescript
// 使用 TypeScript 的类型查询
type WhatIsThisType = typeof ImageMarker.markText; // 查看函数类型
type WhatAreTheseOptions = Parameters<typeof ImageMarker.markText>[0]; // 查看参数类型
type WhatIsTheReturnType = ReturnType<typeof ImageMarker.markText>; // 查看返回类型

// 使用类型断言进行调试
const debugOptions = {} as TextMarkOptions;
// IDE 会显示 TextMarkOptions 的完整结构
```

### 类型测试

```typescript
// 创建类型测试来验证类型正确性
type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false;

// 测试类型别名是否正确
type TestStandardOptions = AssertEqual<
  StandardTextMarkOptions,
  TextMarkOptions<number, any>
>; // 应该是 true

type TestURIOptions = AssertEqual<
  URITextMarkOptions,
  TextMarkOptions<string, string>
>; // 应该是 true
```

通过遵循这些 TypeScript 最佳实践，您可以充分利用 `react-native-image-marker` 的类型安全功能，编写更可靠和可维护的代码。