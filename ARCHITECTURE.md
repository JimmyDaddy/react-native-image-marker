# React Native New Architecture Support

This document describes the dual architecture support in react-native-image-marker, which allows the library to work with both the legacy React Native architecture and the new architecture (TurboModules + Fabric).

## Overview

The library automatically detects the React Native architecture at runtime and uses the appropriate implementation:

- **Legacy Architecture**: Uses traditional React Native bridge communication
- **New Architecture**: Uses TurboModules for direct JavaScript-to-native communication via JSI

## Architecture Detection

The library includes an `ArchitectureDetector` that automatically determines which architecture is available:

```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// Check if new architecture is enabled
const isNewArch = ArchitectureDetector.isNewArchitecture();

// Get detailed architecture information
const info = ArchitectureDetector.getArchitectureInfo();
console.log('New Architecture:', info.isNewArchitecture);
console.log('TurboModules:', info.hasTurboModules);
console.log('JSI:', info.hasJSI);
console.log('Fabric:', info.hasFabric);
```

## Usage

The API remains exactly the same regardless of architecture:

```typescript
import ImageMarker from 'react-native-image-marker';

// This works with both architectures
const result = await ImageMarker.markText({
  backgroundImage: { src: 'path/to/image.jpg' },
  watermarkTexts: [{
    text: 'Watermark',
    position: { position: 'center' }
  }]
});
```

## Configuration

### iOS Configuration

The library automatically configures itself based on the `RCT_NEW_ARCH_ENABLED` environment variable:

```ruby
# In your Podfile or project configuration
ENV['RCT_NEW_ARCH_ENABLED'] = '1'  # Enable new architecture
ENV['RCT_NEW_ARCH_ENABLED'] = '0'  # Use legacy architecture
```

### Android Configuration

The library uses the `newArchEnabled` property in `gradle.properties`:

```properties
# In android/gradle.properties
newArchEnabled=true   # Enable new architecture
newArchEnabled=false  # Use legacy architecture
```

## Build System Integration

### iOS (CocoaPods)

The podspec automatically includes the correct dependencies based on architecture:

```ruby
# New architecture dependencies (automatically included when RCT_NEW_ARCH_ENABLED=1)
s.dependency "React-Codegen"
s.dependency "RCT-Folly"
s.dependency "ReactCommon/turbomodule/core"

# Codegen script phase for generating native interfaces
s.script_phase = {
  :name => 'Generate Specs',
  # ... Codegen configuration
}
```

### Android (Gradle)

The build.gradle automatically configures based on the `newArchEnabled` flag:

```gradle
if (isNewArchitectureEnabled()) {
  apply plugin: "com.facebook.react"
  
  react {
    jsRootDir = file("../src/")
    libraryName = "ImageMarker"
    codegenJavaPackageName = "com.jimmydaddy.imagemarker"
  }
}
```

## Testing

### Local Testing

Test both architectures locally:

```bash
# Test both architectures
npm run test:architecture

# Test only legacy architecture
npm run test:architecture:legacy

# Test only new architecture
npm run test:architecture:new
```

### CI/CD Testing

The library includes GitHub Actions workflows that test both architectures:

- **ci.yml**: Tests both architectures in matrix builds
- **architecture-test.yml**: Dedicated architecture compatibility testing

## Migration Guide

### For Library Users

No code changes are required! The library automatically detects and uses the appropriate architecture.

### For Library Contributors

When adding new features:

1. **Add to TypeScript spec**: Update `specs/NativeImageMarker.ts`
2. **Implement in TurboModule**: Add to `src/TurboModuleImpl.ts`
3. **Implement in Legacy**: Add to `src/LegacyImpl.ts`
4. **Add native implementations**: Update iOS and Android TurboModule implementations
5. **Add tests**: Include tests for both architectures

## Performance Benefits

The new architecture provides several performance improvements:

- **Direct JSI Communication**: Eliminates bridge serialization overhead
- **Synchronous Method Calls**: Some operations can be synchronous when appropriate
- **Better Type Safety**: Compile-time type checking for native interfaces
- **Reduced Memory Usage**: More efficient data passing between JS and native

## Troubleshooting

### Common Issues

1. **Architecture Detection Fails**
   ```typescript
   // Force reset detection cache
   ArchitectureDetector.reset();
   ```

2. **Build Errors with New Architecture**
   - Ensure React Native version supports new architecture (0.68+)
   - Verify `RCT_NEW_ARCH_ENABLED=1` is set correctly
   - Clean and rebuild: `npm run clean && npm run prepack`

3. **Missing TurboModule Dependencies**
   - Check that Codegen ran successfully
   - Verify podspec/gradle configuration is correct

### Debug Information

Enable debug logging to see which architecture is being used:

```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// Log architecture information
console.log('Architecture Info:', ArchitectureDetector.getArchitectureInfo());
```

## Compatibility

### React Native Versions

- **Legacy Architecture**: React Native 0.60+
- **New Architecture**: React Native 0.68+ (stable in 0.70+)

### Platform Support

- **iOS**: iOS 11.0+
- **Android**: API Level 21+ (Android 5.0)

### Expo Support

The library works with Expo projects using:

- **Expo SDK 47+** for new architecture support
- **EAS Build** for both architectures
- **Expo Development Build** for testing

## Contributing

When contributing to the library:

1. Test both architectures: `npm run test:architecture`
2. Update both implementations (TurboModule and Legacy)
3. Add appropriate tests for new features
4. Ensure CI passes for both architectures

## Resources

- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [TurboModules](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [Fabric Renderer](https://reactnative.dev/docs/the-new-architecture/pillars-fabric-components)
- [Codegen](https://reactnative.dev/docs/the-new-architecture/pillars-codegen)