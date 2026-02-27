# Architecture Switching Guide

This guide explains how to switch between Legacy and New Architecture across all example applications in the react-native-image-marker project.

## Overview

The project includes comprehensive tooling to manage React Native architecture configurations across multiple example apps:

- **example**: Base example app
- **example-0.73**: React Native 0.73 example
- **example-0.81**: React Native 0.81 example (optional)
- **expo-example**: Expo example app

## Quick Start

### Check Current Status

```bash
# Check all apps
npm run arch:status

# Check specific app
npm run arch:check example-0.73
```

### Switch All Apps

```bash
# Switch all apps to New Architecture
npm run arch:new-all

# Switch all apps to Legacy Architecture
npm run arch:legacy-all
```

### Switch Individual Apps

```bash
# React Native apps
npm run arch:new example-0.73
npm run arch:legacy example-0.73

# Expo app
npm run expo:arch:new
npm run expo:arch:legacy
```

## Available Commands

### Global Commands (All Apps)

| Command | Description |
|---------|-------------|
| `npm run arch:status` | Show architecture status for all apps |
| `npm run arch:new-all` | Switch all apps to New Architecture |
| `npm run arch:legacy-all` | Switch all apps to Legacy Architecture |
| `npm run arch:validate` | Validate configuration consistency |

### React Native App Commands

| Command | Description |
|---------|-------------|
| `npm run arch:check [app]` | Check architecture status |
| `npm run arch:new [app]` | Switch to New Architecture |
| `npm run arch:legacy [app]` | Switch to Legacy Architecture |

### Expo App Commands

| Command | Description |
|---------|-------------|
| `npm run expo:arch:new` | Switch Expo to New Architecture |
| `npm run expo:arch:legacy` | Switch Expo to Legacy Architecture |

## Detailed Usage

### 1. Checking Architecture Status

#### All Apps

```bash
npm run arch:status
```

Output:
```
════════════════════════════════════════════════════════════
Architecture Status for All Example Apps
════════════════════════════════════════════════════════════

example:
  ✓ android: New Architecture
  ○ ios: Legacy Architecture

example-0.73:
  ○ android: Legacy Architecture
  ○ ios: Legacy Architecture

expo-example:
  ○ android: Legacy Architecture
  ○ ios: Legacy Architecture
```

#### Specific App

```bash
npm run arch:check example-0.73
```

### 2. Switching Architecture

#### Switch All Apps

```bash
# To New Architecture
npm run arch:new-all

# To Legacy Architecture
npm run arch:legacy-all
```

This will:
1. Update all React Native apps (example, example-0.73, example-0.81)
2. Update Expo app
3. Show summary of results

#### Switch Individual React Native App

```bash
# Switch example-0.73 to New Architecture
npm run arch:new example-0.73

# Switch example-0.73 to Legacy Architecture
npm run arch:legacy example-0.73
```

This updates:
- Android: `android/gradle.properties` → `newArchEnabled=true/false`
- iOS: `ios/Podfile` → `ENV['RCT_NEW_ARCH_ENABLED']='1'/'0'`
- iOS: `ios/.xcode.env.local` → `export RCT_NEW_ARCH_ENABLED=1/0`

#### Switch Expo App

```bash
# To New Architecture
npm run expo:arch:new

# To Legacy Architecture
npm run expo:arch:legacy
```

This updates:
- `expo-example/app.json` → Plugin configuration

### 3. Validating Configuration

```bash
npm run arch:validate
```

This checks:
- All apps have valid configuration
- Configuration is consistent across platforms (Android/iOS)
- No missing or corrupted configuration files

Output:
```
════════════════════════════════════════════════════════════
Validating Architecture Configuration
════════════════════════════════════════════════════════════

✓ All configurations are valid and consistent!
```

Or if issues found:
```
⚠ Found 2 issue(s):

1. example
   Type: inconsistent
   Message: Inconsistent architecture across platforms
   Details: android: new, ios: legacy

2. expo-example
   Type: not_configured
   Message: android not configured
```

## Configuration Files

### React Native Apps

#### Android
**File**: `android/gradle.properties`

```properties
# React Native New Architecture
newArchEnabled=true  # or false
```

#### iOS
**File**: `ios/Podfile`

```ruby
# React Native New Architecture
ENV['RCT_NEW_ARCH_ENABLED'] = '1'  # or '0'
```

**File**: `ios/.xcode.env.local`

```bash
# React Native New Architecture
export RCT_NEW_ARCH_ENABLED=1  # or 0
```

### Expo App

**File**: `expo-example/app.json`

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

## Running Apps After Switching

### React Native Apps

#### Android

```bash
cd example-0.73
npm run android
```

#### iOS

```bash
cd example-0.73
npm run pods  # Reinstall pods after architecture change
npm run ios
```

### Expo App

#### Using app.json

```bash
cd expo-example
npm start
# Press 'a' for Android or 'i' for iOS
```

#### Using app.new-arch.json (New Architecture)

```bash
cd expo-example
npm run start:new-arch
npm run android:new-arch  # or npm run ios:new-arch
```

## Workflow Examples

### Example 1: Test Feature in Both Architectures

```bash
# Test in Legacy Architecture
npm run arch:legacy example-0.73
cd example-0.73
npm run pods  # iOS only
npm run android  # or npm run ios

# Test in New Architecture
cd ..
npm run arch:new example-0.73
cd example-0.73
npm run pods  # iOS only
npm run android  # or npm run ios
```

### Example 2: Prepare for Release

```bash
# Ensure all apps are on Legacy Architecture for compatibility
npm run arch:legacy-all

# Validate configuration
npm run arch:validate

# Build and test each app
cd example-0.73
npm run android
npm run ios
```

### Example 3: Development with New Architecture

```bash
# Switch all to New Architecture
npm run arch:new-all

# Verify status
npm run arch:status

# Develop and test
cd example-0.73
npm run pods
npm run android
```

## Troubleshooting

### Issue: Architecture not detected correctly

**Solution**:
```bash
# Check configuration
npm run arch:check example-0.73

# Force switch
npm run arch:new example-0.73
```

### Issue: iOS build fails after switching

**Solution**:
```bash
cd example-0.73/ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Issue: Android build fails after switching

**Solution**:
```bash
cd example-0.73/android
./gradlew clean
cd ..
npm run android
```

### Issue: Inconsistent configuration across platforms

**Solution**:
```bash
# Validate to see issues
npm run arch:validate

# Fix by switching all
npm run arch:new-all  # or arch:legacy-all
```

### Issue: Expo prebuild fails

**Solution**:
```bash
cd expo-example
rm -rf android ios
npm run prebuild  # or prebuild:new-arch
```

## Advanced Usage

### Direct Script Usage

#### Unified Management

```bash
# Status
node scripts/manage-architecture.js status

# Switch all
node scripts/manage-architecture.js switch new
node scripts/manage-architecture.js switch legacy

# Validate
node scripts/manage-architecture.js validate
```

#### React Native Apps

```bash
# Check specific app
node scripts/check-architecture.js example-0.73

# Switch specific app
node scripts/switch-architecture.js new example-0.73
node scripts/switch-architecture.js legacy example-0.73

# Switch all React Native apps
node scripts/switch-architecture.js new
```

#### Expo App

```bash
# Switch Expo
node scripts/switch-expo-architecture.js new
node scripts/switch-expo-architecture.js legacy
```

### Creating example-0.81

If example-0.81 doesn't exist yet:

```bash
# Run the creation script
./scripts/create-example.sh 0.81.0 legacy

# Or follow the manual guide
cat docs/CREATE_EXAMPLE_0.81.md
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Both Architectures

on: [push, pull_request]

jobs:
  test-legacy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Switch to Legacy Architecture
        run: npm run arch:legacy-all
      - name: Validate Configuration
        run: npm run arch:validate
      - name: Build Android
        run: cd example-0.73 && npm run android

  test-new-arch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Switch to New Architecture
        run: npm run arch:new-all
      - name: Validate Configuration
        run: npm run arch:validate
      - name: Build Android
        run: cd example-0.73 && npm run android
```

## Best Practices

1. **Always validate after switching**:
   ```bash
   npm run arch:new-all
   npm run arch:validate
   ```

2. **Reinstall iOS pods after switching**:
   ```bash
   cd example-0.73
   npm run pods
   ```

3. **Clean builds when switching**:
   ```bash
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
   ```

4. **Test both architectures before release**:
   ```bash
   # Test Legacy
   npm run arch:legacy-all
   # Run tests...
   
   # Test New
   npm run arch:new-all
   # Run tests...
   ```

5. **Keep configurations consistent**:
   ```bash
   # Regular validation
   npm run arch:validate
   ```

## Related Documentation

- [Example 0.73 Architecture Guide](../example-0.73/ARCHITECTURE.md)
- [Expo Architecture Guide](../expo-example/ARCHITECTURE.md)
- [Creating Example 0.81](./CREATE_EXAMPLE_0.81.md)
- [React Native New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [Project Architecture](../ARCHITECTURE.md)

## Support

If you encounter issues:

1. Check the status: `npm run arch:status`
2. Validate configuration: `npm run arch:validate`
3. Review app-specific guides in each example directory
4. Check GitHub issues for similar problems
5. Create a new issue with:
   - Output of `npm run arch:status`
   - Output of `npm run arch:validate`
   - Steps to reproduce
