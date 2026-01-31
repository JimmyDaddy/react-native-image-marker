# Expo New Architecture Support

This document explains how to use react-native-image-marker with Expo and React Native's new architecture (Fabric + TurboModules).

## Overview

The library now supports both legacy and new React Native architectures in Expo projects. The Expo plugin automatically configures the necessary build settings based on your configuration.

## Configuration

### Basic Usage (Legacy Architecture)

For legacy architecture support, use the plugin without any configuration:

```json
{
  "expo": {
    "plugins": [
      "react-native-image-marker"
    ]
  }
}
```

### New Architecture Support

To enable new architecture support, configure the plugin with the appropriate options:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-image-marker",
        {
          "newArchEnabled": true,
          "enableFabric": true,
          "enableTurboModules": true
        }
      ]
    ]
  }
}
```

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `newArchEnabled` | boolean | false | Enable React Native new architecture |
| `enableFabric` | boolean | false | Enable Fabric renderer |
| `enableTurboModules` | boolean | false | Enable TurboModules |

## EAS Build Configuration

### Legacy Architecture Build

```json
{
  "build": {
    "production": {
      "env": {
        "RCT_NEW_ARCH_ENABLED": "0"
      }
    }
  }
}
```

### New Architecture Build

```json
{
  "build": {
    "production-new-arch": {
      "env": {
        "RCT_NEW_ARCH_ENABLED": "1",
        "RCT_FABRIC_ENABLED": "1"
      }
    }
  }
}
```

## Development Workflow

### Local Development

1. **Legacy Architecture:**
   ```bash
   expo start
   expo run:ios
   expo run:android
   ```

2. **New Architecture:**
   ```bash
   RCT_NEW_ARCH_ENABLED=1 expo start --config app.new-arch.json
   RCT_NEW_ARCH_ENABLED=1 expo run:ios --config app.new-arch.json
   RCT_NEW_ARCH_ENABLED=1 expo run:android --config app.new-arch.json
   ```

### Prebuild

1. **Legacy Architecture:**
   ```bash
   expo prebuild
   ```

2. **New Architecture:**
   ```bash
   RCT_NEW_ARCH_ENABLED=1 expo prebuild --config app.new-arch.json --clean
   ```

### EAS Build

1. **Legacy Architecture:**
   ```bash
   eas build --profile production
   ```

2. **New Architecture:**
   ```bash
   eas build --profile production-new-arch
   ```

## Compatibility

### Expo SDK Compatibility

The library is compatible with:
- Expo SDK 50+
- React Native 0.73+
- Both legacy and new architecture

### File System Integration

The library integrates with Expo's file system APIs:

```typescript
import * as FileSystem from 'expo-file-system';
import ImageMarker from 'react-native-image-marker';

// Save to Expo's document directory
const result = await ImageMarker.markText({
  backgroundImage: {
    src: require('./background.jpg'),
  },
  watermarkTexts: [{
    text: 'Watermark',
    position: {
      x: 100,
      y: 100,
    },
  }],
  filename: 'watermarked-image.jpg',
});

// Move to Expo's document directory
const documentDir = FileSystem.documentDirectory;
const finalPath = `${documentDir}watermarked-image.jpg`;
await FileSystem.moveAsync({
  from: result,
  to: finalPath,
});
```

## Troubleshooting

### Common Issues

1. **Build Errors with New Architecture:**
   - Ensure you're using Expo SDK 50+
   - Clean your build cache: `expo prebuild --clean`
   - Verify environment variables are set correctly

2. **Plugin Not Applied:**
   - Check that the plugin is properly configured in app.json
   - Run `expo prebuild` to regenerate native code
   - Verify the plugin version matches your library version

3. **Architecture Detection Issues:**
   - The library automatically detects the architecture at runtime
   - You can force architecture detection by setting environment variables
   - Check console logs for architecture detection messages

### Debug Information

To debug architecture detection, you can check the logs:

```typescript
import ImageMarker from 'react-native-image-marker';

// This will log the detected architecture
console.log('Architecture:', ImageMarker.getArchitecture());
```

## Migration Guide

### From Legacy to New Architecture

1. Update your app.json configuration
2. Add new architecture build profiles to eas.json
3. Test both architectures to ensure compatibility
4. Update your CI/CD pipeline to test both architectures

### Gradual Migration

You can maintain both configurations and gradually migrate:

1. Keep your existing legacy configuration
2. Add new architecture configuration as separate profiles
3. Test new architecture builds in parallel
4. Switch to new architecture when ready

## Performance Benefits

With new architecture enabled, you can expect:

- Faster JavaScript to native communication
- Reduced bridge overhead
- Better type safety
- Improved development experience

## Support

For issues specific to Expo integration:
1. Check this documentation
2. Verify your configuration matches the examples
3. Test with both architectures to isolate issues
4. Report issues with full configuration details