# React Native 0.73 Example - Architecture Support

This example app demonstrates the react-native-image-marker library with support for both Legacy and New Architecture (TurboModules + Fabric).

## Architecture Support

This example supports two React Native architectures:

### Legacy Architecture
- Traditional React Native bridge
- Compatible with all React Native versions
- Default configuration

### New Architecture
- TurboModules for native modules
- Fabric for rendering
- Better performance and type safety
- Available in React Native 0.68+

## Current Architecture

To check the current architecture configuration:

```bash
# From project root
npm run arch:check

# Or directly
node scripts/check-architecture.js example-0.73
```

## Switching Architecture

### Using npm scripts (from project root):

```bash
# Switch to New Architecture
npm run arch:new example-0.73

# Switch to Legacy Architecture
npm run arch:legacy example-0.73
```

### Using the script directly:

```bash
# Switch to New Architecture
node scripts/switch-architecture.js new example-0.73

# Switch to Legacy Architecture
node scripts/switch-architecture.js legacy example-0.73
```

## What Gets Changed

When switching architecture, the script updates:

### Android
- `android/gradle.properties`: Sets `newArchEnabled=true/false`

### iOS
- `ios/Podfile`: Sets `ENV['RCT_NEW_ARCH_ENABLED']='1'/'0'`
- `ios/.xcode.env.local`: Sets `export RCT_NEW_ARCH_ENABLED=1/0`

## Running the App

### Android

```bash
# After switching architecture
cd example-0.73
npm run android
```

### iOS

```bash
# After switching architecture, reinstall pods
cd example-0.73
npm run pods
npm run ios
```

## Verifying Architecture

The app uses `ArchitectureDetector` to automatically detect and use the appropriate implementation:

```typescript
import { ArchitectureDetector } from 'react-native-image-marker';

// Check if New Architecture is enabled
const isNewArch = ArchitectureDetector.isNewArchitecture();

// Get detailed architecture info
const info = ArchitectureDetector.getArchitectureInfo();
console.log('TurboModules:', info.hasTurboModules);
console.log('Fabric:', info.hasFabric);
```

## Testing Both Architectures

To ensure the library works correctly in both architectures:

1. **Test with Legacy Architecture:**
   ```bash
   npm run arch:legacy example-0.73
   cd example-0.73
   npm run android  # or npm run ios
   ```

2. **Test with New Architecture:**
   ```bash
   npm run arch:new example-0.73
   cd example-0.73
   npm run pods  # iOS only
   npm run android  # or npm run ios
   ```

3. **Verify functionality:**
   - Test text watermarking
   - Test image watermarking
   - Test different positions and styles
   - Verify performance

## Troubleshooting

### Android Build Issues

If you encounter build issues after switching:

```bash
cd example-0.73/android
./gradlew clean
cd ..
npm run android
```

### iOS Build Issues

If you encounter build issues after switching:

```bash
cd example-0.73/ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Architecture Detection Issues

If the app doesn't detect the architecture correctly:

1. Check the configuration files:
   ```bash
   npm run arch:check example-0.73
   ```

2. Ensure consistency between Android and iOS settings

3. Clean and rebuild:
   ```bash
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
   ```

## Features Demonstrated

This example app demonstrates all features of react-native-image-marker:

- ✅ Text watermarking with custom fonts
- ✅ Image watermarking with multiple images
- ✅ Position-based placement (topLeft, center, etc.)
- ✅ Custom X/Y positioning
- ✅ Text styling (bold, italic, underline, strikethrough)
- ✅ Text shadows and backgrounds
- ✅ Image rotation and scaling
- ✅ Alpha transparency
- ✅ Multiple output formats (PNG, JPG, Base64)
- ✅ Background image from file or base64

All features work identically in both Legacy and New Architecture modes.

## Performance Comparison

The New Architecture provides:

- Faster native module calls (TurboModules)
- Better type safety at compile time
- Reduced serialization overhead
- Improved rendering performance (Fabric)

You can compare performance by:

1. Running the same operations in both architectures
2. Measuring execution time
3. Monitoring memory usage

## Contributing

When contributing to this example:

1. Test changes in both architectures
2. Ensure feature parity between architectures
3. Update this documentation if adding new features
4. Run the architecture tests:
   ```bash
   npm run test:architecture
   ```

## Related Documentation

- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [TurboModules](https://reactnative.dev/docs/the-new-architecture/pillars-turbomodules)
- [Fabric Renderer](https://reactnative.dev/docs/the-new-architecture/pillars-fabric-components)
- [Project Architecture Guide](../ARCHITECTURE.md)
