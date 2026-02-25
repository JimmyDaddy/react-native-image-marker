# Expo Example - Architecture Support

This Expo example app demonstrates the react-native-image-marker library with support for both Legacy and New Architecture (TurboModules + Fabric) in an Expo environment.

## Architecture Support

This example supports two React Native architectures in Expo:

### Legacy Architecture
- Traditional React Native bridge
- Compatible with all Expo SDK versions
- Default configuration in `app.json`

### New Architecture
- TurboModules for native modules
- Fabric for rendering
- Better performance and type safety
- Configured in `app.new-arch.json`
- Requires Expo SDK 50+

## Configuration Files

### app.json (Default - Configurable)
The main configuration file. Can be configured for either Legacy or New Architecture.

### app.new-arch.json (New Architecture)
Dedicated configuration for New Architecture. Always configured for New Architecture.

## Current Architecture

To check the current architecture configuration:

```bash
# From project root
node scripts/switch-expo-architecture.js --help

# Check current status (shows app.json configuration)
node scripts/check-architecture.js expo-example
```

## Switching Architecture

### Method 1: Update app.json (Recommended)

```bash
# From project root

# Switch to New Architecture
node scripts/switch-expo-architecture.js new

# Switch to Legacy Architecture
node scripts/switch-expo-architecture.js legacy
```

### Method 2: Use Different Config Files

You can also use the dedicated config files directly:

```bash
cd expo-example

# Use app.json (default)
npm start
npm run android  # or npm run ios

# Use app.new-arch.json (New Architecture)
npm run start:new-arch
npm run android:new-arch  # or npm run ios:new-arch
```

## What Gets Changed

When switching architecture in Expo, the script updates:

### app.json
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-image-marker",
        {
          "newArchEnabled": true,  // or false
          "enableFabric": true,    // or false
          "enableTurboModules": true  // or false
        }
      ]
    ]
  }
}
```

## Running the App

### Development Mode

#### Legacy Architecture
```bash
cd expo-example

# Using app.json (after switching to legacy)
npm start
npm run android  # or npm run ios
```

#### New Architecture
```bash
cd expo-example

# Option 1: Using app.json (after switching to new)
npm start
npm run android  # or npm run ios

# Option 2: Using app.new-arch.json explicitly
npm run start:new-arch
npm run android:new-arch  # or npm run ios:new-arch
```

### Prebuild (Generate Native Projects)

#### Legacy Architecture
```bash
cd expo-example
npm run prebuild
```

#### New Architecture
```bash
cd expo-example
npm run prebuild:new-arch
```

This generates native Android and iOS projects with the appropriate architecture configuration.

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

### Test with Legacy Architecture:

```bash
# Switch to legacy
node scripts/switch-expo-architecture.js legacy

cd expo-example
npm start
# Press 'a' for Android or 'i' for iOS
```

### Test with New Architecture:

```bash
# Switch to new
node scripts/switch-expo-architecture.js new

cd expo-example
npm start
# Press 'a' for Android or 'i' for iOS

# Or use the dedicated config
npm run start:new-arch
```

## Expo-Specific Features

### Config Plugin

The `react-native-image-marker` Expo config plugin automatically:

- Configures Android build.gradle for the selected architecture
- Configures iOS Podfile for the selected architecture
- Sets up Codegen for TurboModules
- Handles native dependencies

### Prebuild Support

Expo prebuild generates native projects with the correct architecture:

```bash
# Legacy
npm run prebuild

# New Architecture
npm run prebuild:new-arch
```

After prebuild, you can:
- Open the native projects in Android Studio / Xcode
- Run native builds directly
- Debug native code

### EAS Build

For EAS Build, specify the architecture in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

Then build with:

```bash
# Legacy
eas build --platform android --profile production

# New Architecture (using app.new-arch.json)
eas build --platform android --profile production --config app.new-arch.json
```

## Troubleshooting

### Metro Bundler Issues

```bash
cd expo-example
npm start -- --clear
```

### Prebuild Issues

```bash
cd expo-example

# Clean and rebuild
rm -rf android ios
npm run prebuild  # or npm run prebuild:new-arch
```

### Architecture Detection Issues

1. Check the configuration:
   ```bash
   node scripts/switch-expo-architecture.js --help
   ```

2. Verify app.json:
   ```bash
   cat expo-example/app.json | grep -A 5 "react-native-image-marker"
   ```

3. Clear cache and restart:
   ```bash
   cd expo-example
   npm start -- --clear
   ```

### Native Build Issues

If you encounter native build issues after switching:

```bash
cd expo-example

# Clean native projects
rm -rf android ios

# Regenerate with correct architecture
npm run prebuild  # or npm run prebuild:new-arch
```

## Features Demonstrated

This Expo example demonstrates all features of react-native-image-marker:

- ✅ Text watermarking with custom fonts
- ✅ Image watermarking with multiple images
- ✅ Position-based placement
- ✅ Custom X/Y positioning
- ✅ Text styling (bold, italic, underline, strikethrough)
- ✅ Text shadows and backgrounds
- ✅ Image rotation and scaling
- ✅ Alpha transparency
- ✅ Multiple output formats (PNG, JPG, Base64)
- ✅ Expo-specific integrations (expo-image-picker, expo-file-system)

All features work identically in both Legacy and New Architecture modes.

## Performance Comparison

The New Architecture in Expo provides:

- Faster native module calls (TurboModules)
- Better type safety at compile time
- Reduced serialization overhead
- Improved rendering performance (Fabric)
- Better integration with Expo modules

## Expo SDK Compatibility

- **Expo SDK 50+**: Full New Architecture support
- **Expo SDK 49**: Experimental New Architecture support
- **Expo SDK 48 and below**: Legacy Architecture only

Current example uses: Expo SDK 50

## Development Workflow

### Recommended Workflow

1. **Development**: Use Expo Go or development builds
   ```bash
   npm start
   ```

2. **Testing**: Test both architectures
   ```bash
   # Legacy
   node scripts/switch-expo-architecture.js legacy
   npm start
   
   # New
   node scripts/switch-expo-architecture.js new
   npm start
   ```

3. **Production**: Build with EAS Build
   ```bash
   eas build --platform all
   ```

### Using Development Builds

For New Architecture testing, create a development build:

```bash
# Prebuild with New Architecture
npm run prebuild:new-arch

# Create development build
eas build --profile development --platform android
# or
eas build --profile development --platform ios
```

## Contributing

When contributing to this Expo example:

1. Test changes in both architectures
2. Ensure feature parity between architectures
3. Test with both `expo start` and `expo prebuild`
4. Update this documentation if adding new features
5. Verify EAS Build compatibility

## Related Documentation

- [Expo New Architecture](https://docs.expo.dev/guides/new-architecture/)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Project Architecture Guide](../ARCHITECTURE.md)

## Scripts Reference

```bash
# Start development server
npm start                    # Use app.json
npm run start:new-arch       # Use app.new-arch.json

# Run on devices
npm run android              # Use app.json
npm run android:new-arch     # Use app.new-arch.json
npm run ios                  # Use app.json
npm run ios:new-arch         # Use app.new-arch.json

# Prebuild
npm run prebuild             # Legacy Architecture
npm run prebuild:new-arch    # New Architecture

# Install Expo dependencies
npm run expo-install

# Architecture switching (from project root)
node scripts/switch-expo-architecture.js legacy
node scripts/switch-expo-architecture.js new
```
