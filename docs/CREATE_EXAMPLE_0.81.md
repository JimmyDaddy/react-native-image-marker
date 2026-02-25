# Creating React Native 0.81 Example App

This guide explains how to create a React Native 0.81 example app with dual architecture support.

## Prerequisites

- Node.js >= 16
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)

## Step 1: Initialize React Native 0.81 Project

```bash
# From project root
npx react-native@0.81.0 init ImageMarkerExample081 --version 0.81.0

# Rename to example-0.81
mv ImageMarkerExample081 example-0.81
```

## Step 2: Link the Library

```bash
cd example-0.81

# Add the library as a dependency
npm install --save ../

# Or use yarn
yarn add link:../
```

## Step 3: Copy App.tsx from example-0.73

```bash
# Copy the demo app
cp -r ../example-0.73/src ./
cp -r ../example-0.73/assets ./

# Update package.json to include required dependencies
```

## Step 4: Install Dependencies

Add these dependencies to `example-0.81/package.json`:

```json
{
  "dependencies": {
    "@expo/react-native-action-sheet": "^4.0.1",
    "filesize": "^10.1.0",
    "react-native-blob-util": "^0.19.2",
    "react-native-image-picker": "^5.6.0",
    "react-native-reanimated-table": "^0.0.2",
    "react-native-toast-message": "^2.1.6"
  }
}
```

Then install:

```bash
npm install
# or
yarn install
```

## Step 5: Configure Android

### Update `android/build.gradle`

Ensure it uses the correct Gradle and Kotlin versions for RN 0.81:

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 23
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "25.1.8937393"
        kotlinVersion = "1.9.0"
    }
    // ...
}
```

### Update `android/gradle.properties`

```properties
# React Native New Architecture
newArchEnabled=false

# Hermes
hermesEnabled=true

# Kotlin
kotlin_version=1.9.0
```

## Step 6: Configure iOS

### Update `ios/Podfile`

Add at the top (after require statements):

```ruby
# React Native New Architecture
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

### Create `ios/.xcode.env.local`

```bash
# React Native New Architecture
export RCT_NEW_ARCH_ENABLED=0
```

### Install Pods

```bash
cd ios
pod install
cd ..
```

## Step 7: Configure Custom Fonts (Optional)

If using custom fonts from example-0.73:

### Android

1. Copy fonts to `android/app/src/main/assets/fonts/`
2. Update `android/app/build.gradle`:

```gradle
project.ext.react = [
    enableHermes: true,
    bundleAssetName: "index.android.bundle",
    bundleInDebug: false,
    bundleInRelease: true,
    resourcesDir: ["$rootDir/assets"]
]
```

### iOS

1. Copy fonts to `ios/` directory
2. Add fonts to Xcode project
3. Update `Info.plist`:

```xml
<key>UIAppFonts</key>
<array>
    <string>MaShanZheng-Regular.ttf</string>
    <string>RubikBurned-Regular.ttf</string>
</array>
```

## Step 8: Test Architecture Switching

```bash
# From project root

# Check current architecture
npm run arch:check example-0.81

# Switch to New Architecture
npm run arch:new example-0.81

# Switch to Legacy Architecture
npm run arch:legacy example-0.81
```

## Step 9: Run the App

### Android

```bash
cd example-0.81
npm run android
```

### iOS

```bash
cd example-0.81
npm run pods
npm run ios
```

## Step 10: Verify Functionality

Test all features in both architectures:

1. **Legacy Architecture:**
   ```bash
   npm run arch:legacy example-0.81
   cd example-0.81
   npm run android  # or npm run ios
   ```

2. **New Architecture:**
   ```bash
   npm run arch:new example-0.81
   cd example-0.81
   npm run pods  # iOS only
   npm run android  # or npm run ios
   ```

3. **Test Features:**
   - Text watermarking
   - Image watermarking
   - Position-based placement
   - Custom styling
   - Multiple output formats

## React Native 0.81 Specific Features

### New Architecture Improvements

React Native 0.81 includes:

- Improved TurboModule performance
- Better Fabric renderer stability
- Enhanced JSI integration
- Improved Codegen support

### API Changes

Check for any API changes in RN 0.81:

```typescript
// Example: Check architecture at runtime
import { ArchitectureDetector } from 'react-native-image-marker';

const info = ArchitectureDetector.getArchitectureInfo();
console.log('Architecture Info:', info);
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clean Android
cd example-0.81/android
./gradlew clean
cd ../..

# Clean iOS
cd example-0.81/ios
rm -rf Pods Podfile.lock
pod install
cd ../..
```

### Metro Bundler Issues

```bash
cd example-0.81
npm start -- --reset-cache
```

### Architecture Detection Issues

```bash
# Verify configuration
npm run arch:check example-0.81

# Force architecture switch
npm run arch:new example-0.81
# or
npm run arch:legacy example-0.81
```

## Automated Setup Script

You can create a setup script `scripts/create-example-0.81.sh`:

```bash
#!/bin/bash

set -e

echo "Creating React Native 0.81 example app..."

# Initialize project
npx react-native@0.81.0 init ImageMarkerExample081 --version 0.81.0
mv ImageMarkerExample081 example-0.81

cd example-0.81

# Link library
npm install --save ../

# Copy demo app
cp -r ../example-0.73/src ./
cp -r ../example-0.73/assets ./

# Install dependencies
npm install @expo/react-native-action-sheet filesize react-native-blob-util react-native-image-picker react-native-reanimated-table react-native-toast-message

# Configure architecture
cd ..
npm run arch:legacy example-0.81

echo "✓ React Native 0.81 example app created successfully!"
echo ""
echo "Next steps:"
echo "  cd example-0.81"
echo "  npm run android  # or npm run ios"
```

Make it executable:

```bash
chmod +x scripts/create-example-0.81.sh
```

Run it:

```bash
./scripts/create-example-0.81.sh
```

## Integration with CI

Update `.github/workflows/ci.yml` to include example-0.81:

```yaml
strategy:
  matrix:
    example: [example, example-0.73, example-0.81]
    architecture: [legacy, new]
```

## Documentation

Create `example-0.81/ARCHITECTURE.md` similar to example-0.73:

```bash
cp example-0.73/ARCHITECTURE.md example-0.81/ARCHITECTURE.md
# Update version references from 0.73 to 0.81
```

## Maintenance

When updating the library:

1. Test in both example-0.73 and example-0.81
2. Verify both architectures work correctly
3. Update documentation if APIs change
4. Run architecture tests:
   ```bash
   npm run test:architecture
   ```

## Related Documentation

- [React Native 0.81 Release Notes](https://github.com/facebook/react-native/releases/tag/v0.81.0)
- [New Architecture Migration Guide](../docs/NEW_ARCHITECTURE_MIGRATION.md)
- [Architecture Switching Guide](../example-0.73/ARCHITECTURE.md)
