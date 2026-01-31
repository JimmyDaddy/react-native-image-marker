# React Native New Architecture Migration Guide

This guide will help you migrate `react-native-image-marker` from the legacy bridge architecture to React Native's New Architecture (TurboModules + Fabric).

## Table of Contents

- [Overview](#overview)
- [New Architecture Benefits](#new-architecture-benefits)
- [Compatibility](#compatibility)
- [Migration Steps](#migration-steps)
- [Configuration](#configuration)
- [API Changes](#api-changes)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

React Native's New Architecture introduces two main components:

- **TurboModules**: A new native module system providing better performance and type safety
- **Fabric**: A new rendering system providing better UI performance

`react-native-image-marker` v1.2.0+ fully supports the New Architecture while maintaining backward compatibility with the legacy architecture.

## New Architecture Benefits

### Performance Improvements
- **Faster startup time**: TurboModules are loaded on-demand, reducing app startup time
- **Lower memory footprint**: Optimized serialization and communication mechanisms
- **Better concurrency**: JSI direct communication reduces bridge overhead

### Developer Experience
- **Complete TypeScript support**: Auto-generated type definitions
- **Better error handling**: Unified error format with more detailed error messages
- **Architecture detection**: Automatic detection and selection of the best implementation

### Type Safety
- **Generic support**: Complete generic type system
- **Compile-time checking**: TypeScript compiler validates parameter types
- **Smart suggestions**: Better IDE support and code completion

## Compatibility

| React Native Version | New Architecture Support | Recommended Version |
|---------------------|--------------------------|-------------------|
| >= 0.74.0           | ✅ Full Support          | v1.2.0+          |
| >= 0.73.0           | ✅ Full Support          | v1.2.0+          |
| >= 0.72.0           | ⚠️ Experimental         | v1.2.0+          |
| < 0.72.0            | ❌ Not Supported        | v1.1.x           |

## Migration Steps

### 1. Update Dependencies

```bash
# Update to the latest version
npm install react-native-image-marker@latest

# Or using yarn
yarn add react-native-image-marker@latest
```

### 2. Enable New Architecture

#### iOS Configuration

Enable New Architecture in `ios/Podfile`:

```ruby
# Enable New Architecture
ENV['RCT_NEW_ARCH_ENABLED'] = '1'

# Or set during build
# RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
```

#### Android Configuration

Enable New Architecture in `android/gradle.properties`:

```properties
# Enable New Architecture
newArchEnabled=true

# Enable Hermes (recommended)
hermesEnabled=true
```

### 3. Rebuild Project

```bash
# iOS
cd ios && RCT_NEW_ARCH_ENABLED=1 bundle exec pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

### 4. Verify Migration

Use the architecture detection API to verify the New Architecture is working:

```typescript
import ImageMarker from 'react-native-image-marker';

// Check if New Architecture is enabled
const isNewArch = ImageMarker.isNewArchitecture();
console.log('New Architecture enabled:', isNewArch);

// Check if Fabric is available
const isFabric = ImageMarker.isFabricEnabled();
console.log('Fabric enabled:', isFabric);

// Get architecture information
import { ArchitectureDetector } from 'react-native-image-marker';
const info = ArchitectureDetector.getArchitectureInfo();
console.log('Architecture info:', info);
```

## Configuration

### TypeScript Configuration

Ensure your `tsconfig.json` supports the New Architecture:

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

### Metro Configuration

If using custom Metro configuration, ensure it supports the New Architecture:

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

## API Changes

### Backward Compatibility

All existing APIs remain fully compatible, no code changes required:

```typescript
// Existing code continues to work
import ImageMarker, { Position, ImageFormat } from 'react-native-image-marker';

const result = await ImageMarker.markText({
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Hello World',
    position: { position: Position.center }
  }]
});
```

### New Features

#### Generic Type Support

```typescript
import ImageMarker, { 
  type StandardTextMarkOptions,
  type StrictTextMarkOptions,
  type URITextMarkOptions 
} from 'react-native-image-marker';

// Standard options (number coordinates + any image source)
const standardOptions: StandardTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Standard',
    position: { X: 100, Y: 200 }
  }]
};

// Strict options (number coordinates + require() image source)
const strictOptions: StrictTextMarkOptions = {
  backgroundImage: { src: require('./bg.jpg') },
  watermarkTexts: [{
    text: 'Strict',
    position: { X: 100, Y: 200 }
  }]
};

// URI options (string coordinates + URI image source)
const uriOptions: URITextMarkOptions = {
  backgroundImage: { src: 'https://example.com/bg.jpg' },
  watermarkTexts: [{
    text: 'URI',
    position: { X: '50%', Y: '25%' }
  }]
};
```

#### Architecture Detection API

```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// Detect New Architecture
const isNewArch = ArchitectureDetector.isNewArchitecture();

// Detect TurboModules
const hasTurboModules = ArchitectureDetector.hasTurboModules();

// Detect JSI
const hasJSI = ArchitectureDetector.hasJSI();

// Detect Fabric
const hasFabric = ArchitectureDetector.hasFabric();

// Get complete information
const info = ArchitectureDetector.getArchitectureInfo();
```

#### Fabric Image Loading

```typescript
import { FabricImageLoader } from 'react-native-image-marker';

// Check if Fabric is enabled
const isFabricEnabled = FabricImageLoader.isFabricEnabled();

// Clear image cache
FabricImageLoader.clearCache();

// Get cache statistics
const stats = FabricImageLoader.getCacheStats();
console.log(`Cache size: ${stats.size}, Cache keys: ${stats.keys.length}`);
```

## Performance Optimization

### Serialization Optimization

The New Architecture automatically optimizes data serialization:

```typescript
import { SerializationOptimizer } from 'react-native-image-marker';

// Manual optimization (usually not needed)
const optimizedOptions = SerializationOptimizer.optimizeTextMarkOptions({
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{
    text: 'Test',
    position: { X: undefined, Y: 100 }, // undefined values are removed
    style: {
      padding: 10,
      paddingLeft: 10, // duplicate values are merged
    }
  }],
  quality: 90, // default values are removed
});
```

### Memory Management

```typescript
// Periodically clear cache
setInterval(() => {
  ImageMarker.clearImageCache();
}, 60000); // Clear every minute

// Monitor memory usage
const stats = ImageMarker.getImageCacheStats();
if (stats.size > 100) { // If cache is too large
  ImageMarker.clearImageCache();
}
```

### Concurrent Processing

```typescript
// New Architecture supports better concurrent processing
const promises = [
  ImageMarker.markText(options1),
  ImageMarker.markText(options2),
  ImageMarker.markText(options3),
];

const results = await Promise.all(promises);
```

## Troubleshooting

### Common Issues

#### 1. Architecture Detection Failure

```typescript
// Check architecture detection
import { ArchitectureDetector } from 'react-native-image-marker';

try {
  const isNewArch = ArchitectureDetector.isNewArchitecture();
  console.log('New Architecture status:', isNewArch);
} catch (error) {
  console.error('Architecture detection failed:', error);
  // Will automatically fallback to legacy architecture
}
```

#### 2. TurboModule Loading Failure

```typescript
// Check TurboModule availability
import { ArchitectureDetector } from 'react-native-image-marker';

const info = ArchitectureDetector.getArchitectureInfo();
if (!info.hasTurboModules) {
  console.warn('TurboModules not available, using legacy bridge');
}
```

#### 3. Type Errors

```typescript
// Ensure correct type imports
import ImageMarker, { 
  type TextMarkOptions,
  type ImageMarkOptions,
  Position,
  ImageFormat 
} from 'react-native-image-marker';

// Use explicit type annotations
const options: TextMarkOptions = {
  backgroundImage: { src: 'test.jpg' },
  watermarkTexts: [{ text: 'Test' }]
};
```

### Debugging Tips

#### Enable Verbose Logging

```typescript
// Enable verbose logging in development mode
if (__DEV__) {
  import { ErrorHandler } from 'react-native-image-marker';
  
  // Set error handler
  ErrorHandler.setDebugMode(true);
}
```

#### Performance Monitoring

```typescript
// Monitor performance
const startTime = Date.now();
const result = await ImageMarker.markText(options);
const endTime = Date.now();
console.log(`Processing time: ${endTime - startTime}ms`);
```

### Build Issues

#### iOS Build Failure

```bash
# Clean and reinstall Pods
cd ios
rm -rf Pods Podfile.lock
RCT_NEW_ARCH_ENABLED=1 bundle exec pod install
cd ..
```

#### Android Build Failure

```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Rebuild
npx react-native run-android
```

## Best Practices

### 1. Progressive Migration

```typescript
// Use architecture detection for progressive migration
import { ArchitectureDetector } from 'react-native-image-marker';

const useOptimizedFeatures = ArchitectureDetector.isNewArchitecture();

if (useOptimizedFeatures) {
  // Use New Architecture features
  const result = await ImageMarker.markText(complexOptions);
} else {
  // Use simplified options for compatibility
  const result = await ImageMarker.markText(simpleOptions);
}
```

### 2. Error Handling

```typescript
import { ErrorHandler } from 'react-native-image-marker';

try {
  const result = await ImageMarker.markText(options);
  return result;
} catch (error) {
  // Unified error handling
  const normalizedError = ErrorHandler.normalizeError(error, 'markText');
  console.error('Image processing failed:', normalizedError.message);
  throw normalizedError;
}
```

### 3. Type Safety

```typescript
// Use strict type definitions
import type { 
  StandardTextMarkOptions,
  StandardImageMarkOptions 
} from 'react-native-image-marker';

// Define type-safe utility functions
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

### 4. Performance Optimization

```typescript
// Use caching and batching
const imageCache = new Map<string, string>();

async function processImageWithCache(
  options: StandardTextMarkOptions,
  cacheKey: string
): Promise<string> {
  // Check cache
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  
  // Process image
  const result = await ImageMarker.markText(options);
  
  // Cache result
  imageCache.set(cacheKey, result);
  
  return result;
}
```

### 5. Testing Strategy

```typescript
// Test both architectures
import { ArchitectureDetector } from 'react-native-image-marker';

describe('ImageMarker', () => {
  beforeEach(() => {
    // Reset architecture detection
    ArchitectureDetector.reset();
  });
  
  it('should work with both architectures', async () => {
    const options = createTestOptions();
    
    // Test current architecture
    const result = await ImageMarker.markText(options);
    expect(typeof result).toBe('string');
    
    // Verify architecture info
    const info = ArchitectureDetector.getArchitectureInfo();
    console.log('Test architecture:', info);
  });
});
```

## Summary

React Native's New Architecture brings significant performance improvements and better developer experience to `react-native-image-marker`. By following this guide, you can:

1. **Seamless migration**: Get New Architecture benefits while keeping existing code unchanged
2. **Performance boost**: Leverage TurboModules and JSI performance advantages
3. **Enhanced type safety**: Use complete TypeScript support and generic types
4. **Improved developer experience**: Get better error handling and debugging support

If you encounter any issues during migration, please check the [Troubleshooting](#troubleshooting) section or submit an issue on GitHub.