import * as fs from 'fs';
import * as path from 'path';

/**
 * Cross-platform version detector for React Native projects
 * Supports version detection for React Native 0.73, 0.81, 0.8x and platform capability detection
 */
export class CrossPlatformVersionDetector {
  private static _reactNativeVersion: string | null = null;
  private static _platformCapabilities: PlatformCapabilities | null = null;
  private static _configurationStrategy: CrossPlatformConfigurationStrategy | null =
    null;

  /**
   * Detects the current React Native version
   * @returns React Native version string (e.g., "0.73.3", "0.81.0")
   */
  static detectReactNativeVersion(): string {
    if (this._reactNativeVersion === null) {
      this._reactNativeVersion = this.detectVersionFromEnvironment();
    }
    return this._reactNativeVersion;
  }

  /**
   * Gets the appropriate configuration strategy for the detected version
   * @param version Optional version override
   * @returns Configuration strategy for the version
   */
  static getConfigurationStrategy(
    version?: string
  ): CrossPlatformConfigurationStrategy {
    const targetVersion = version || this.detectReactNativeVersion();

    if (this._configurationStrategy === null || version) {
      this._configurationStrategy =
        this.createConfigurationStrategy(targetVersion);
    }
    return this._configurationStrategy;
  }

  /**
   * Checks if a React Native version is supported
   * @param version Version to check
   * @returns true if version is supported
   */
  static isVersionSupported(version: string): boolean {
    const supportedVersions = ['0.73', '0.81', '0.8'];
    return supportedVersions.some((supported) => version.startsWith(supported));
  }

  /**
   * Detects platform capabilities for Android and iOS
   * @returns Platform capabilities object
   */
  static detectPlatformCapabilities(): PlatformCapabilities {
    if (this._platformCapabilities === null) {
      this._platformCapabilities = this.detectCapabilities();
    }
    return this._platformCapabilities;
  }

  /**
   * Internal method to detect React Native version from various sources
   * @returns Detected version string
   */
  private static detectVersionFromEnvironment(): string {
    try {
      // Try to read from package.json in current project
      const packageJsonPath = this.findPackageJson();
      if (packageJsonPath) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );

        // Check dependencies and devDependencies for react-native
        const rnVersion =
          packageJson.dependencies?.['react-native'] ||
          packageJson.devDependencies?.['react-native'];

        if (rnVersion) {
          return this.normalizeVersion(rnVersion);
        }
      }

      // Try to read from node_modules/react-native/package.json
      const rnPackageJsonPath = this.findReactNativePackageJson();
      if (rnPackageJsonPath) {
        const rnPackageJson = JSON.parse(
          fs.readFileSync(rnPackageJsonPath, 'utf8')
        );
        return this.normalizeVersion(rnPackageJson.version);
      }

      // Try to read from React Native runtime if available
      try {
        const ReactNative = require('react-native');
        if (ReactNative && ReactNative.version) {
          return `${ReactNative.version.major}.${ReactNative.version.minor}.${ReactNative.version.patch}`;
        }
      } catch {
        // React Native not available in runtime
      }

      // Default fallback version
      return '0.73.0';
    } catch (error) {
      console.warn('Failed to detect React Native version:', error);
      return '0.73.0';
    }
  }

  /**
   * Finds the nearest package.json file
   * @returns Path to package.json or null if not found
   */
  private static findPackageJson(): string | null {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Finds React Native's package.json in node_modules
   * @returns Path to react-native package.json or null if not found
   */
  private static findReactNativePackageJson(): string | null {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const rnPackageJsonPath = path.join(
        currentDir,
        'node_modules',
        'react-native',
        'package.json'
      );
      if (fs.existsSync(rnPackageJsonPath)) {
        return rnPackageJsonPath;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Normalizes version string by removing prefixes and suffixes
   * @param version Raw version string
   * @returns Normalized version string
   */
  private static normalizeVersion(version: string): string {
    // Remove common prefixes like ^, ~, >=, etc.
    const cleanVersion = version.replace(/^[\^~>=<]+/, '');

    // Extract major.minor.patch format
    const versionMatch = cleanVersion.match(/(\d+\.\d+\.\d+)/);
    if (versionMatch && versionMatch[1]) {
      return versionMatch[1];
    }

    // Extract major.minor format and add .0
    const shortVersionMatch = cleanVersion.match(/(\d+\.\d+)/);
    if (shortVersionMatch) {
      return `${shortVersionMatch[1]}.0`;
    }

    return cleanVersion;
  }

  /**
   * Creates configuration strategy based on version
   * @param version React Native version
   * @returns Configuration strategy
   */
  private static createConfigurationStrategy(
    version: string
  ): CrossPlatformConfigurationStrategy {
    const majorMinor = version.substring(0, 4); // e.g., "0.73", "0.81"

    switch (majorMinor) {
      case '0.73':
        return new ReactNative073ConfigurationStrategy();
      case '0.81':
        return new ReactNative081ConfigurationStrategy();
      default:
        // For 0.8x and newer versions
        if (version.startsWith('0.8')) {
          return new ReactNative08xConfigurationStrategy();
        }
        // Default to latest strategy for unknown versions
        return new ReactNative08xConfigurationStrategy();
    }
  }

  /**
   * Detects platform capabilities
   * @returns Platform capabilities
   */
  private static detectCapabilities(): PlatformCapabilities {
    return {
      android: this.detectAndroidCapabilities(),
      ios: this.detectIOSCapabilities(),
      expo: this.detectExpoCapabilities(),
    };
  }

  /**
   * Detects Android platform capabilities
   * @returns Android capabilities
   */
  private static detectAndroidCapabilities(): AndroidCapabilities {
    const version = this.detectReactNativeVersion();
    const hasNewArchitecture = this.checkAndroidNewArchitecture();

    // Determine Gradle plugin version based on React Native version
    let gradlePluginVersion = '8.1.0';
    if (version.startsWith('0.73')) {
      gradlePluginVersion = '8.1.0';
    } else if (version.startsWith('0.81')) {
      gradlePluginVersion = '8.3.0';
    } else if (version.startsWith('0.8')) {
      gradlePluginVersion = '8.4.0';
    }

    return {
      hasNewArchitecture,
      gradlePluginVersion,
      supportedSDKVersions: [33, 34, 35],
    };
  }

  /**
   * Detects iOS platform capabilities
   * @returns iOS capabilities
   */
  private static detectIOSCapabilities(): IOSCapabilities {
    const version = this.detectReactNativeVersion();
    const hasNewArchitecture = this.checkIOSNewArchitecture();

    // Determine Xcode version based on React Native version
    let xcodeVersion = '15.0';
    if (version.startsWith('0.73')) {
      xcodeVersion = '15.0';
    } else if (version.startsWith('0.81')) {
      xcodeVersion = '15.3';
    } else if (version.startsWith('0.8')) {
      xcodeVersion = '16.0';
    }

    return {
      hasNewArchitecture,
      xcodeVersion,
      supportedIOSVersions: ['13.0', '14.0', '15.0', '16.0', '17.0', '18.0'],
    };
  }

  /**
   * Detects Expo capabilities
   * @returns Expo capabilities
   */
  private static detectExpoCapabilities(): ExpoCapabilities {
    const version = this.detectReactNativeVersion();

    // Check if Expo is present
    const hasExpo = this.checkExpoPresence();

    let sdkVersion = '50.0.0';
    let supportsNewArchitecture = false;

    if (version.startsWith('0.73')) {
      sdkVersion = '50.0.0';
      supportsNewArchitecture = true;
    } else if (version.startsWith('0.81')) {
      sdkVersion = '52.0.0';
      supportsNewArchitecture = true;
    } else if (version.startsWith('0.8')) {
      sdkVersion = '53.0.0';
      supportsNewArchitecture = true;
    }

    return {
      sdkVersion,
      supportsPrebuild: hasExpo,
      supportsNewArchitecture,
    };
  }

  /**
   * Checks if Android new architecture is enabled
   * @returns true if new architecture is enabled
   */
  private static checkAndroidNewArchitecture(): boolean {
    try {
      // Check gradle.properties
      const gradlePropsPath = path.join(
        process.cwd(),
        'android',
        'gradle.properties'
      );
      if (fs.existsSync(gradlePropsPath)) {
        const gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
        return gradleProps.includes('newArchEnabled=true');
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  /**
   * Checks if iOS new architecture is enabled
   * @returns true if new architecture is enabled
   */
  private static checkIOSNewArchitecture(): boolean {
    try {
      // Check for RCT_NEW_ARCH_ENABLED environment variable or Podfile configuration
      if (process.env.RCT_NEW_ARCH_ENABLED === '1') {
        return true;
      }

      // Check Podfile for new architecture configuration
      const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');
      if (fs.existsSync(podfilePath)) {
        const podfile = fs.readFileSync(podfilePath, 'utf8');
        return (
          podfile.includes('RCT_NEW_ARCH_ENABLED') && podfile.includes('1')
        );
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  /**
   * Checks if Expo is present in the project
   * @returns true if Expo is detected
   */
  private static checkExpoPresence(): boolean {
    try {
      const packageJsonPath = this.findPackageJson();
      if (packageJsonPath) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8')
        );
        return !!(
          packageJson.dependencies?.expo || packageJson.devDependencies?.expo
        );
      }
    } catch {
      // Ignore errors
    }
    return false;
  }

  /**
   * Reset all cached detection results
   * Useful for testing purposes
   */
  static reset(): void {
    this._reactNativeVersion = null;
    this._platformCapabilities = null;
    this._configurationStrategy = null;
  }
}

// Configuration Strategy Interfaces
export interface CrossPlatformConfigurationStrategy {
  getAndroidConfig(): AndroidConfig;
  getIOSConfig(): IOSConfig;
  getCodegenConfig(): CodegenConfig;
  getExpoConfig(): ExpoConfig;
}

export interface AndroidConfig {
  gradleConfig: GradleConfig;
  buildConfig: AndroidBuildConfig;
  codegenConfig: AndroidCodegenConfig;
}

export interface IOSConfig {
  podspecConfig: PodspecConfig;
  buildConfig: IOSBuildConfig;
  codegenConfig: IOSCodegenConfig;
}

export interface CodegenConfig {
  name: string;
  type: 'modules' | 'components' | 'all';
  jsSrcsDir: string;
  specFiles: string[];
  android?: {
    javaPackageName: string;
    outputDir: string;
  };
  ios?: {
    moduleName: string;
    outputDir: string;
  };
}

export interface ExpoConfig {
  sdkVersion: string;
  supportsPrebuild: boolean;
  supportsNewArchitecture: boolean;
  configPluginVersion: string;
}

// Platform Capabilities Interfaces
export interface PlatformCapabilities {
  android: AndroidCapabilities;
  ios: IOSCapabilities;
  expo: ExpoCapabilities;
}

export interface AndroidCapabilities {
  hasNewArchitecture: boolean;
  gradlePluginVersion: string;
  supportedSDKVersions: number[];
}

export interface IOSCapabilities {
  hasNewArchitecture: boolean;
  xcodeVersion: string;
  supportedIOSVersions: string[];
}

export interface ExpoCapabilities {
  sdkVersion: string;
  supportsPrebuild: boolean;
  supportsNewArchitecture: boolean;
}

// Build Configuration Interfaces
export interface GradleConfig {
  pluginVersion: string;
  kotlinVersion: string;
  compileSdkVersion: number;
  targetSdkVersion: number;
  minSdkVersion: number;
}

export interface AndroidBuildConfig {
  namespace: string;
  compileSdkVersion: number;
  targetSdkVersion: number;
  minSdkVersion: number;
  gradlePluginVersion: string;
  kotlinVersion: string;
}

export interface AndroidCodegenConfig {
  location: 'package.json' | 'build.gradle';
  javaPackageName: string;
  outputDir: string;
}

export interface PodspecConfig {
  deploymentTarget: string;
  swiftVersion: string;
  xcodeVersion: string;
  fabricEnabled: boolean;
  turboModulesEnabled: boolean;
}

export interface IOSBuildConfig {
  deploymentTarget: string;
  swiftVersion: string;
  xcodeVersion: string;
  fabricEnabled: boolean;
  turboModulesEnabled: boolean;
}

export interface IOSCodegenConfig {
  location: 'package.json' | 'podspec';
  moduleName: string;
  outputDir: string;
}

// Configuration Strategy Implementations
class ReactNative073ConfigurationStrategy
  implements CrossPlatformConfigurationStrategy
{
  getAndroidConfig(): AndroidConfig {
    return {
      gradleConfig: {
        pluginVersion: '8.1.0',
        kotlinVersion: '1.8.0',
        compileSdkVersion: 34,
        targetSdkVersion: 34,
        minSdkVersion: 21,
      },
      buildConfig: {
        namespace: 'com.jimmydaddy.imagemarker',
        compileSdkVersion: 34,
        targetSdkVersion: 34,
        minSdkVersion: 21,
        gradlePluginVersion: '8.1.0',
        kotlinVersion: '1.8.0',
      },
      codegenConfig: {
        location: 'package.json',
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
    };
  }

  getIOSConfig(): IOSConfig {
    return {
      podspecConfig: {
        deploymentTarget: '13.0',
        swiftVersion: '5.0',
        xcodeVersion: '15.0',
        fabricEnabled: true,
        turboModulesEnabled: true,
      },
      buildConfig: {
        deploymentTarget: '13.0',
        swiftVersion: '5.0',
        xcodeVersion: '15.0',
        fabricEnabled: true,
        turboModulesEnabled: true,
      },
      codegenConfig: {
        location: 'package.json',
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getCodegenConfig(): CodegenConfig {
    return {
      name: 'RNImageMarkerSpec',
      type: 'modules',
      jsSrcsDir: 'src',
      specFiles: ['specs/NativeImageMarker.ts'],
      android: {
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
      ios: {
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getExpoConfig(): ExpoConfig {
    return {
      sdkVersion: '50.0.0',
      supportsPrebuild: true,
      supportsNewArchitecture: true,
      configPluginVersion: '1.0.0',
    };
  }
}

class ReactNative081ConfigurationStrategy
  implements CrossPlatformConfigurationStrategy
{
  getAndroidConfig(): AndroidConfig {
    return {
      gradleConfig: {
        pluginVersion: '8.3.0',
        kotlinVersion: '1.9.0',
        compileSdkVersion: 34,
        targetSdkVersion: 34,
        minSdkVersion: 23,
      },
      buildConfig: {
        namespace: 'com.jimmydaddy.imagemarker',
        compileSdkVersion: 34,
        targetSdkVersion: 34,
        minSdkVersion: 23,
        gradlePluginVersion: '8.3.0',
        kotlinVersion: '1.9.0',
      },
      codegenConfig: {
        location: 'build.gradle',
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
    };
  }

  getIOSConfig(): IOSConfig {
    return {
      podspecConfig: {
        deploymentTarget: '13.4',
        swiftVersion: '5.9',
        xcodeVersion: '15.3',
        fabricEnabled: true,
        turboModulesEnabled: true,
      },
      buildConfig: {
        deploymentTarget: '13.4',
        swiftVersion: '5.9',
        xcodeVersion: '15.3',
        fabricEnabled: true,
        turboModulesEnabled: true,
      },
      codegenConfig: {
        location: 'podspec',
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getCodegenConfig(): CodegenConfig {
    return {
      name: 'RNImageMarkerSpec',
      type: 'modules',
      jsSrcsDir: 'src',
      specFiles: ['specs/NativeImageMarker.ts'],
      android: {
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
      ios: {
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getExpoConfig(): ExpoConfig {
    return {
      sdkVersion: '52.0.0',
      supportsPrebuild: true,
      supportsNewArchitecture: true,
      configPluginVersion: '1.2.0',
    };
  }
}

class ReactNative08xConfigurationStrategy
  implements CrossPlatformConfigurationStrategy
{
  getAndroidConfig(): AndroidConfig {
    return {
      gradleConfig: {
        pluginVersion: '8.4.0',
        kotlinVersion: '1.9.22',
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        minSdkVersion: 24,
      },
      buildConfig: {
        namespace: 'com.jimmydaddy.imagemarker',
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        minSdkVersion: 24,
        gradlePluginVersion: '8.4.0',
        kotlinVersion: '1.9.22',
      },
      codegenConfig: {
        location: 'build.gradle',
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
    };
  }

  getIOSConfig(): IOSConfig {
    return {
      podspecConfig: {
        deploymentTarget: '14.0',
        swiftVersion: '5.10',
        xcodeVersion: '16.0',
        fabricEnabled: true,
        turboModulesEnabled: true,
      },
      buildConfig: {
        deploymentTarget: '14.0',
        swiftVersion: '5.10',
        xcodeVersion: '16.0',
        fabricEnabled: true,
        turboModulesEnabled: true,
      },
      codegenConfig: {
        location: 'podspec',
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getCodegenConfig(): CodegenConfig {
    return {
      name: 'RNImageMarkerSpec',
      type: 'modules',
      jsSrcsDir: 'src',
      specFiles: ['specs/NativeImageMarker.ts'],
      android: {
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
      ios: {
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getExpoConfig(): ExpoConfig {
    return {
      sdkVersion: '53.0.0',
      supportsPrebuild: true,
      supportsNewArchitecture: true,
      configPluginVersion: '2.0.0',
    };
  }
}
