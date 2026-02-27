<div align="center">
    <a href="https://jimmydaddy.github.io/react-native-image-marker/" title="react native image marker">
        <img src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/icon.png" alt="react native image marker Logo" width="150" />
    </a>
    <a href="https://jimmydaddy.github.io/react-native-image-marker/"><h1 style="color: #424E6D">react native image marker</h1></a>
    <h6>为图片添加文字或图标水印</h6>
</div>
<div align="center">

  [![npm version](https://img.shields.io/npm/v/react-native-image-marker.svg?logo=npm&style=for-the-badge&label=latest)](https://www.npmjs.com/package/react-native-image-marker)
  [![npm](https://img.shields.io/npm/dm/react-native-image-marker?logo=npm&style=for-the-badge)](https://www.npmjs.com/package/react-native-image-marker) [![npm](https://img.shields.io/npm/dt/react-native-image-marker.svg?cacheSeconds=88660&logo=npm&label=total%20downloads&style=for-the-badge)](https://www.npmjs.com/package/react-native-image-marker)
  [![stars](https://img.shields.io/github/stars/jimmydaddy/react-native-image-marker?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker) [![forks](https://img.shields.io/github/forks/jimmydaddy/react-native-image-marker?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker/fork)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker/pulls) ![license](https://img.shields.io/npm/l/react-native-image-marker?style=for-the-badge)
  [![github](https://img.shields.io/badge/github-repo-blue?logo=github&style=for-the-badge)](https://github.com/JimmyDaddy/react-native-image-marker)
  [![CI](https://github.com/JimmyDaddy/react-native-image-marker/actions/workflows/ci.yml/badge.svg)](https://github.com/JimmyDaddy/react-native-image-marker/actions/workflows/ci.yml)
  ![platform-iOS](https://img.shields.io/badge/iOS-black?logo=Apple&style=for-the-badge) ![platform-Android](https://img.shields.io/badge/Android-black?logo=Android&style=for-the-badge)
  <br/>

</div>

---

> * 如果这个库对你有帮助，请给我一个 ⭐️。🤩
> * 如果发现任何 bug，请提交 issue 🐛，或者创建 pull request 🤓。
> * 如果在使用过程中遇到任何问题，请联系我，或者[发起 QA 讨论](https://github.com/JimmyDaddy/react-native-image-marker/discussions/categories/q-a)。🤔

**[English Documentation](./README.MD)**

---

## 目录

* [核心特性](#核心特性)
* [安装](#安装)
  * [React Native](#react-native)
  * [Expo](#expo)
* [兼容性](#兼容性)
* [新架构支持](#新架构支持)
* [使用指南](#使用指南)
  * [架构检测](#架构检测)
  * [类型安全 API](#类型安全-api)
  * [性能优化](#性能优化)
* [功能示例](#功能示例)
* [API 文档](#api-文档)
* [保存图片到文件](#保存图片到文件)
* [贡献者](#贡献者)
* [示例项目](#示例项目)
* [贡献指南](#贡献指南)
* [许可证](#许可证)

<br/>

## 核心特性

<div>
  <img align="right" width="25%" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/IOSMarker.gif" width='150'>
  <img align="right" width="25%" src="https://raw.githubusercontent.com/JimmyDaddy/react-native-image-marker/master/assets/AndroidMarker.gif" width='150'>
</div>

### 🚀 React Native 新架构支持

- **完整的 TurboModules 和 Fabric 支持**，自动回退到传统桥接
- **JSI 直接通信**，减少序列化开销
- **自动架构检测**，无需手动配置
- **向后兼容**，现有代码无需修改即可工作

### ⚡ 性能优化

- **自动序列化优化**，减少数据传输开销
- **Fabric 图片缓存集成**，提升图片加载性能
- **内存使用优化**，支持大图片处理
- **异步处理优化**，不阻塞 UI 线程

### 🔒 类型安全

- **完整的 TypeScript 支持**，编译时类型检查
- **泛型类型支持**，灵活的类型推断
- **Codegen 自动生成**，确保类型一致性
- **IDE 智能提示**，提升开发体验

### 🎨 丰富的水印功能

- **多文字水印**，支持多行文本和样式自定义
- **多图标水印**，支持多个图标叠加
- **旋转支持**，背景和水印都可旋转
- **透明度控制**，灵活的透明度设置
- **灵活的文字样式**：
  - 旋转、阴影、背景色
  - 斜体、粗体、删除线
  - 文字对齐、内边距
  - 背景圆角
- **兼容 Android 和 iOS**
- **支持 Expo**

## 安装

### React Native

```shell
# npm
npm install react-native-image-marker --save

# yarn
yarn add react-native-image-marker
```

### Expo

```shell
# 安装
npx expo install react-native-image-marker

# 编译
npx expo prebuild

# 或使用 EAS Build
eas build
```

## 兼容性

| React Native 版本 | react-native-image-marker 版本 | 新架构支持 |
| -------------------- | --------------------------------- | ------------------------ |
| >= 0.74.0 | v2.0.0 或更高 | ✅ 完全支持 |
| >= 0.73.0 | v2.0.0 或更高 | ✅ 完全支持 |
| >= 0.72.0 | v2.0.0 或更高 | ⚠️ 实验性支持 |
| 0.60.0 <= rn < 0.72.0 | v1.1.x | ❌ 仅传统架构 |
| >= 0.60.0, ***iOS < 13, Android < N(API Level 24)*** | v1.0.x | ❌ 仅传统架构 |
| < 0.60.0 | v0.5.2 或更早 | ❌ 仅传统架构 |

> ***注意：此表格仅适用于 react-native-image-marker 的主要版本。补丁版本应该向后兼容。***

## 新架构支持

### 什么是新架构？

React Native 的新架构包括：
- **TurboModules**：新的原生模块系统，提供更好的性能和类型安全
- **Fabric**：新的渲染系统，提供更快的渲染和更好的用户体验
- **JSI**：JavaScript 接口，实现 JavaScript 和原生代码之间的直接通信

### 启用新架构

#### iOS

```bash
cd ios
RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
cd ..
```

#### Android

在 `android/gradle.properties` 中添加：

```properties
newArchEnabled=true
```

### 架构检测

库会自动检测当前架构并选择最佳实现：

```typescript
import ImageMarker from 'react-native-image-marker';

// 检查是否启用了新架构
const isNewArch = ImageMarker.isNewArchitecture();
console.log('新架构已启用:', isNewArch);

// 获取详细的架构信息
const info = ImageMarker.getArchitectureInfo();
console.log('架构信息:', {
  isNewArchitecture: info.isNewArchitecture,
  hasTurboModules: info.hasTurboModules,
  hasJSI: info.hasJSI,
  hasFabric: info.hasFabric
});
```

### 性能对比

| 操作 | 传统架构 | 新架构 | 提升 |
| --------- | ------------------- | ---------------- | ----------- |
| 方法调用开销 | ~1-2ms | ~0.1-0.2ms | **10x** |
| 数据序列化 | JSON 序列化 | 直接传递 | **5x** |
| 类型安全 | 运行时检查 | 编译时检查 | ✅ |
| 内存使用 | 标准 | 优化 | **-20%** |

## 使用指南

### 架构检测

```typescript
import ImageMarker, { ArchitectureDetector } from 'react-native-image-marker';

// 方法 1：使用 ImageMarker 静态方法
const isNewArch = ImageMarker.isNewArchitecture();
const isFabric = ImageMarker.isFabricEnabled();

// 方法 2：使用 ArchitectureDetector
const info = ArchitectureDetector.getArchitectureInfo();
console.log('架构详情:', info);

// 重置检测缓存（用于测试）
ArchitectureDetector.reset();
```

### 类型安全 API

新架构提供增强的 TypeScript 支持：

```typescript
import ImageMarker, { 
  type StandardTextMarkOptions,
  type URITextMarkOptions,
  Position,
  ImageFormat 
} from 'react-native-image-marker';

// 标准选项（数字坐标 + 任意图片源）
const standardOptions: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: '你好世界',
    position: { X: 100, Y: 200 }, // 数字坐标
    style: { fontSize: 20, color: '#FFFFFF' }
  }]
};

// URI 选项（百分比坐标 + URI 图片源）
const uriOptions: URITextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: '你好世界',
    position: { X: '50%', Y: '25%' }, // 百分比坐标
    style: { fontSize: 20, color: '#FFFFFF' }
  }]
};

// 两种方式都使用相同的 API
const result1 = await ImageMarker.markText(standardOptions);
const result2 = await ImageMarker.markText(uriOptions);
```

### 性能优化

新架构包含自动性能优化：

```typescript
// 自动序列化优化（无需修改代码）
const result = await ImageMarker.markText({
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{
    text: '优化',
    position: { X: undefined, Y: 100 }, // undefined 值会自动移除
    style: {
      padding: 10,
      paddingLeft: 10, // 重复值会自动合并
    }
  }],
  quality: 90, // 默认值会自动优化
});

// 手动缓存管理
ImageMarker.clearImageCache(); // 清除 Fabric 图片缓存
const stats = ImageMarker.getImageCacheStats(); // 获取缓存统计
console.log(`缓存大小: ${stats.size}, 键数量: ${stats.keys.length}`);
```

## 功能示例

### 文字水印

```typescript
import ImageMarker, { Position, TextBackgroundType, ImageFormat } from 'react-native-image-marker';

const result = await ImageMarker.markText({
  backgroundImage: {
    src: require('./images/bg.jpg'),
    scale: 1,
  },
  watermarkTexts: [{
    text: '你好世界\n多行文本',
    position: {
      position: Position.center,
    },
    style: {
      color: '#FFFFFF',
      fontSize: 30,
      fontName: 'Arial',
      shadowStyle: {
        dx: 10,
        dy: 10,
        radius: 10,
        color: '#000000',
      },
      textBackgroundStyle: {
        padding: '10% 10%',
        type: TextBackgroundType.stretchX,
        color: '#00000080',
        cornerRadius: {
          topLeft: { x: 10, y: 10 },
          topRight: { x: 10, y: 10 },
          bottomLeft: { x: 10, y: 10 },
          bottomRight: { x: 10, y: 10 },
        },
      },
    },
  }],
  quality: 100,
  filename: 'marked',
  saveFormat: ImageFormat.png,
});

console.log('结果:', result);
```

### 图标水印

```typescript
const result = await ImageMarker.markImage({
  backgroundImage: {
    src: require('./images/bg.jpg'),
    scale: 1,
  },
  watermarkImages: [{
    src: require('./images/watermark.png'),
    position: {
      position: Position.bottomRight,
    },
    alpha: 0.8,
    scale: 0.5,
  }],
  quality: 100,
  filename: 'marked',
  saveFormat: ImageFormat.jpg,
});
```

### 多个水印

```typescript
const result = await ImageMarker.markText({
  backgroundImage: {
    src: require('./images/bg.jpg'),
  },
  watermarkTexts: [
    {
      text: '标题',
      position: { position: Position.topCenter },
      style: { fontSize: 40, color: '#FFFFFF' }
    },
    {
      text: '副标题',
      position: { position: Position.center },
      style: { fontSize: 30, color: '#CCCCCC' }
    },
    {
      text: '版权信息',
      position: { position: Position.bottomRight },
      style: { fontSize: 20, color: '#999999' }
    }
  ],
});
```

更多示例请参考：
- [文字背景适配](https://jimmydaddy.github.io/react-native-image-marker/enums/TextBackgroundType.html)
- [阴影效果](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ShadowLayerStyle.html)
- [旋转效果](https://jimmydaddy.github.io/react-native-image-marker/interfaces/ImageOptions.html#rotate)
- [完整示例](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)

## API 文档

### 完整文档

- [API 参考](./docs/API_REFERENCE.md) - 完整的 API 文档和示例
- [TypeScript 指南](./docs/TYPESCRIPT_GUIDE.md) - 类型安全使用模式和最佳实践
- [新架构迁移指南](./docs/NEW_ARCHITECTURE_MIGRATION.md) - 分步迁移说明

### 在线文档

- [最新 API (v2.0.x)](https://jimmydaddy.github.io/react-native-image-marker/classes/Marker.html)
- [v1.1.x](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.1.x)
- [v1.0.x](https://github.com/JimmyDaddy/react-native-image-marker/wiki/v1.0.x)
- [v0.9.2 及更早版本](https://github.com/JimmyDaddy/react-native-image-marker/wiki/0.9.2)

### 主要 API

#### ImageMarker.markText(options)

为图片添加文字水印。

```typescript
markText(options: TextMarkOptions): Promise<string>
```

#### ImageMarker.markImage(options)

为图片添加图标水印。

```typescript
markImage(options: ImageMarkOptions): Promise<string>
```

#### 架构检测 API

```typescript
// 检查是否启用了新架构
isNewArchitecture(): boolean

// 检查是否启用了 Fabric
isFabricEnabled(): boolean

// 获取详细的架构信息
getArchitectureInfo(): ArchitectureInfo

// 清除图片缓存
clearImageCache(): void

// 获取缓存统计
getImageCacheStats(): CacheStats
```

## 保存图片到文件

* 要将新图片保存到手机相册，请使用 [React Native 的 CameraRoll 模块](https://facebook.github.io/react-native/docs/cameraroll.html#savetocameraroll)
* 要保存到任意文件路径，请使用 [react-native-fs](https://github.com/itinance/react-native-fs)
* 对于更高级的需求，你可以编写自己的（或找到另一个）原生模块来解决你的用例

## 贡献者

感谢所有贡献者！

[@filipef101](https://github.com/filipef101)
[@mikaello](https://github.com/mikaello)
[@Peretz30](https://github.com/Peretz30)
[@gaoxiaosong](https://github.com/gaoxiaosong)
[@onka13](https://github.com/onka13)
[@OrangeFlavoredColdCoffee](https://github.com/OrangeFlavoredColdCoffee)
[@vioku](https://github.com/vioku)

## 示例项目

### React Native 示例

[example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/example)

在本地运行示例：

```bash
git clone git@github.com:JimmyDaddy/react-native-image-marker.git
cd ./react-native-image-marker

# 安装依赖
yarn

# Android
# 首先打开 Android 模拟器或连接真实设备
yarn example android

# iOS
yarn example ios
```

### Expo 示例

[expo-example](https://github.com/JimmyDaddy/react-native-image-marker/tree/master/expo-example)

在本地运行 Expo 示例：

```bash
git clone git@github.com:JimmyDaddy/react-native-image-marker.git
cd ./react-native-image-marker

# 安装依赖
yarn

# Android
# 首先打开 Android 模拟器或连接真实设备
yarn expo-example android

# iOS
yarn expo-example ios
```

## 贡献指南

查看[贡献指南](CONTRIBUTING.md)了解如何为仓库做出贡献以及开发工作流程。

## 许可证

[MIT](LICENSE)

---

## 更新日志

### v2.0.0 - 新架构支持

- ✅ 完整的 TurboModules 和 Fabric 支持
- ✅ 自动架构检测和回退
- ✅ JSI 直接通信，性能提升 10 倍
- ✅ 完整的 TypeScript 类型支持
- ✅ 自动序列化优化
- ✅ Fabric 图片缓存集成
- ✅ 向后兼容，无破坏性变更

查看完整的[更新日志](CHANGELOG.md)。

---

* 如果这个库对你有帮助，请给我一个 ⭐️。🤩
* 如果发现任何 bug，请提交 issue 🐛，或者创建 pull request 🤓。
* 如果在使用过程中遇到任何问题，请联系我，或者[发起 QA 讨论](https://github.com/JimmyDaddy/react-native-image-marker/discussions/categories/q-a)。🤔

使用 [create-react-native-library](https://github.com/callstack/react-native-builder-bob) 创建
