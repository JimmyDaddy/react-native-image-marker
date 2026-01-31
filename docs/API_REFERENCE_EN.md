# API Reference

This document provides a comprehensive API reference for `react-native-image-marker`, including new architecture features and type definitions.

## Table of Contents

- [Main API](#main-api)
- [Type Definitions](#type-definitions)
- [Architecture Detection](#architecture-detection)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Main API

### ImageMarker Class

The main image watermarking class that provides static methods for image processing.

#### `markText<T, S>(options: TextMarkOptions<T, S>): Promise<string>`

Add text watermarks to a background image.

**Generic Parameters:**
- `T`: Numeric type (`number | string`) for coordinates and dimensions
- `S`: Image source type for image resources

**Parameters:**
- `options`: Text watermark options

**Returns:**
- `Promise<string>`: Path to the processed image or base64 string

**Examples:**
```typescript
// Using numeric coordinates
const result = await ImageMarker.markText<number, any>({
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { X: 100, Y: 200 }
  }]
});

// Using percentage coordinates
const result2 = await ImageMarker.markText<string, string>({
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: 'Hello World',
    position: { X: '50%', Y: '25%' }
  }]
});
```

#### `markImage<T, S>(options: ImageMarkOptions<T, S>): Promise<string>`

Add image watermarks to a background image.

**Generic Parameters:**
- `T`: Numeric type (`number | string`) for coordinates and dimensions
- `S`: Image source type for image resources

**Parameters:**
- `options`: Image watermark options

**Returns:**
- `Promise<string>`: Path to the processed image or base64 string

**Example:**
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

Check if React Native New Architecture is enabled.

**Returns:**
- `boolean`: `true` if New Architecture is enabled, `false` otherwise

#### `isFabricEnabled(): boolean`

Check if Fabric renderer is enabled.

**Returns:**
- `boolean`: `true` if Fabric is enabled, `false` otherwise

#### `clearImageCache(): void`

Clear the Fabric image cache.

#### `getImageCacheStats(): { size: number; keys: string[] }`

Get Fabric image cache statistics.

**Returns:**
- `{ size: number; keys: string[] }`: Cache size and key list

## Type Definitions

### Basic Types

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

### Enum Types

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

### Interface Types

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
  watermarkImage?: ImageOptions<S>; // Deprecated
  watermarkPositions?: PositionOptions<T>; // Deprecated
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
  watermarkImages: WatermarkImageOptions<T, S>[];
}
```

### Type Aliases

For convenience, the following type aliases are provided:

#### Standard Type Aliases
```typescript
// Numeric coordinates + any image source
type StandardTextMarkOptions = TextMarkOptions<number, any>;
type StandardImageMarkOptions = ImageMarkOptions<number, any>;

// Numeric coordinates + require() image source
type StrictTextMarkOptions = TextMarkOptions<number, number>;
type StrictImageMarkOptions = ImageMarkOptions<number, number>;

// String coordinates + URI image source
type URITextMarkOptions = TextMarkOptions<string, string>;
type URIImageMarkOptions = ImageMarkOptions<string, string>;
```

#### Utility Types
```typescript
// Extract background image type
type BackgroundImageType<T extends TextMarkOptions<any, any>> = T['backgroundImage'];

// Extract watermark text type
type WatermarkTextType<T extends TextMarkOptions<any, any>> = T['watermarkTexts'][0];

// Infer numeric type
type InferNumericType<T> = T extends TextMarkOptions<infer N, any> ? N : NumericValue;

// Infer source type
type InferSourceType<T> = T extends TextMarkOptions<any, infer S> ? S : any;
```

## Architecture Detection

### ArchitectureDetector Class

Provides React Native architecture detection functionality.

#### `isNewArchitecture(): boolean`

Check if New Architecture is enabled.

#### `hasTurboModules(): boolean`

Check if TurboModules are supported.

#### `hasJSI(): boolean`

Check if JSI is supported.

#### `hasFabric(): boolean`

Check if Fabric is supported.

#### `getArchitectureInfo(): ArchitectureInfo`

Get complete architecture information.

```typescript
interface ArchitectureInfo {
  isNewArchitecture: boolean;
  hasTurboModules: boolean;
  hasJSI: boolean;
  hasFabric: boolean;
}
```

#### `reset(): void`

Reset architecture detection cache (mainly for testing).

**Example:**
```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// Detect New Architecture
const isNewArch = ArchitectureDetector.isNewArchitecture();

// Get detailed information
const info = ArchitectureDetector.getArchitectureInfo();
console.log('Architecture info:', info);

// Reset detection (for testing)
ArchitectureDetector.reset();
```

## Performance Optimization

### SerializationOptimizer Class

Provides data serialization optimization (automatically used in New Architecture).

#### `optimizeTextMarkOptions(options: any): any`

Optimize text watermark options.

#### `optimizeImageMarkOptions(options: any): any`

Optimize image watermark options.

**Example:**
```typescript
import { SerializationOptimizer } from 'react-native-image-marker';

// Manual optimization (usually not needed)
const optimized = SerializationOptimizer.optimizeTextMarkOptions({
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{
    text: 'Test',
    position: { X: undefined, Y: 100 }, // undefined will be removed
  }],
  quality: 90, // Default values will be optimized
});
```

### FabricImageLoader Class

Provides Fabric image loading functionality.

#### `isFabricEnabled(): boolean`

Check if Fabric is enabled.

#### `loadImage(source: any, options?: any): Promise<any>`

Load image (internal use).

#### `clearCache(): void`

Clear image cache.

#### `getCacheStats(): { size: number; keys: string[] }`

Get cache statistics.

**Example:**
```typescript
import { FabricImageLoader } from 'react-native-image-marker';

// Check Fabric status
const isFabric = FabricImageLoader.isFabricEnabled();

// Manage cache
FabricImageLoader.clearCache();
const stats = FabricImageLoader.getCacheStats();
```

## Error Handling

### ErrorHandler Class

Provides unified error handling functionality.

#### `normalizeError(error: any, context: string): Error`

Normalize error objects.

#### `validateInput(options: any, method: string): void`

Validate input parameters.

#### `wrapAsyncOperation<T>(operation: () => Promise<T>, context: string): Promise<T>`

Wrap async operations.

#### `handleArchitectureDetectionError(error: any): boolean`

Handle architecture detection errors.

#### `handleTurboModuleLoadError(error: any): Error`

Handle TurboModule loading errors.

**Example:**
```typescript
import { ErrorHandler } from 'react-native-image-marker';

try {
  const result = await ImageMarker.markText(options);
} catch (error) {
  const normalizedError = ErrorHandler.normalizeError(error, 'markText');
  console.error('Processing failed:', normalizedError.message);
}
```

## Usage Examples

### Basic Usage

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

### Advanced Usage (New Architecture)

```typescript
import ImageMarker, { 
  type StandardTextMarkOptions,
  ArchitectureDetector,
  FabricImageLoader 
} from 'react-native-image-marker';

// Check architecture
const isNewArch = ArchitectureDetector.isNewArchitecture();
console.log('Using New Architecture:', isNewArch);

// Type-safe options
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

// Manage cache
if (FabricImageLoader.isFabricEnabled()) {
  const stats = ImageMarker.getImageCacheStats();
  if (stats.size > 50) {
    ImageMarker.clearImageCache();
  }
}
```

### Error Handling

```typescript
import ImageMarker, { ErrorHandler } from 'react-native-image-marker';

async function processImage(options: any) {
  try {
    // Validate input
    ErrorHandler.validateInput(options, 'markText');
    
    // Process image
    const result = await ImageMarker.markText(options);
    return result;
  } catch (error) {
    // Normalize error
    const normalizedError = ErrorHandler.normalizeError(error, 'processImage');
    console.error('Image processing failed:', normalizedError.message);
    throw normalizedError;
  }
}
```

This API reference covers all major functionality and type definitions, providing developers with a complete usage guide.