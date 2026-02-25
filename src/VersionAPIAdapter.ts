import { CrossPlatformVersionDetector } from './CrossPlatformVersionDetector';
import { CrossPlatformBuildSystemAdapter } from './CrossPlatformBuildSystemAdapter';

/**
 * Version API Adapter for React Native projects
 * Provides a unified interface for different React Native versions
 * Abstracts API differences between versions to ensure consistent build results
 */
export class VersionAPIAdapter {
  private static _versionCache: Map<string, VersionAPIInterface> = new Map();
  private static _currentAdapter: VersionAPIInterface | null = null;

  /**
   * Gets the appropriate API adapter for the current or specified React Native version
   * @param version Optional React Native version (will detect if not provided)
   * @returns Version-specific API adapter
   */
  static getAdapter(version?: string): VersionAPIInterface {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();

    // Check cache first
    if (this._versionCache.has(targetVersion)) {
      return this._versionCache.get(targetVersion)!;
    }

    // Create new adapter based on version
    const adapter = this.createAdapter(targetVersion);
    this._versionCache.set(targetVersion, adapter);
    this._currentAdapter = adapter;

    return adapter;
  }

  /**
   * Creates a version-specific adapter
   * @param version React Native version
   * @returns Version-specific API adapter
   */
  private static createAdapter(version: string): VersionAPIInterface {
    const majorMinor = version.substring(0, 4); // e.g., "0.73", "0.81"

    switch (majorMinor) {
      case '0.73':
        return new ReactNative073APIAdapter(version);
      case '0.81':
        return new ReactNative081APIAdapter(version);
      default:
        // For 0.8x and newer versions
        if (version.startsWith('0.8')) {
          return new ReactNative08xAPIAdapter(version);
        }
        // Default to latest adapter for unknown versions
        return new ReactNative08xAPIAdapter(version);
    }
  }

  /**
   * Gets the current active adapter
   * @returns Current API adapter or null if not initialized
   */
  static getCurrentAdapter(): VersionAPIInterface | null {
    return this._currentAdapter;
  }

  /**
   * Resets the adapter cache
   * Useful for testing purposes
   */
  static reset(): void {
    this._versionCache.clear();
    this._currentAdapter = null;
  }

  /**
   * Validates API compatibility between versions
   * @param sourceVersion Source React Native version
   * @param targetVersion Target React Native version
   * @returns Compatibility validation result
   */
  static validateAPICompatibility(
    sourceVersion: string,
    targetVersion: string
  ): APICompatibilityResult {
    const sourceAdapter = this.getAdapter(sourceVersion);
    const targetAdapter = this.getAdapter(targetVersion);

    const result: APICompatibilityResult = {
      isCompatible: true,
      breakingChanges: [],
      warnings: [],
      migrationSteps: [],
    };

    // Check Codegen API compatibility
    const codegenCompatibility = this.checkCodegenCompatibility(
      sourceAdapter,
      targetAdapter
    );
    result.breakingChanges.push(...codegenCompatibility.breakingChanges);
    result.warnings.push(...codegenCompatibility.warnings);

    // Check Build System compatibility
    const buildSystemCompatibility = this.checkBuildSystemCompatibility(
      sourceAdapter,
      targetAdapter
    );
    result.breakingChanges.push(...buildSystemCompatibility.breakingChanges);
    result.warnings.push(...buildSystemCompatibility.warnings);

    // Check Architecture compatibility
    const archCompatibility = this.checkArchitectureCompatibility(
      sourceAdapter,
      targetAdapter
    );
    result.breakingChanges.push(...archCompatibility.breakingChanges);
    result.warnings.push(...archCompatibility.warnings);

    // Determine overall compatibility
    result.isCompatible = result.breakingChanges.length === 0;

    // Generate migration steps if needed
    if (!result.isCompatible) {
      result.migrationSteps = this.generateMigrationSteps(
        sourceVersion,
        targetVersion,
        result.breakingChanges
      );
    }

    return result;
  }

  /**
   * Checks Codegen API compatibility between versions
   */
  private static checkCodegenCompatibility(
    sourceAdapter: VersionAPIInterface,
    targetAdapter: VersionAPIInterface
  ): { breakingChanges: string[]; warnings: string[] } {
    const breakingChanges: string[] = [];
    const warnings: string[] = [];

    const sourceCodegen = sourceAdapter.getCodegenConfiguration();
    const targetCodegen = targetAdapter.getCodegenConfiguration();

    // Check if Codegen location changed
    if (
      sourceCodegen.android.location !== targetCodegen.android.location ||
      sourceCodegen.ios.location !== targetCodegen.ios.location
    ) {
      breakingChanges.push(
        `Codegen configuration location changed from ${sourceCodegen.android.location} to ${targetCodegen.android.location}`
      );
    }

    return { breakingChanges, warnings };
  }

  /**
   * Checks Build System compatibility between versions
   */
  private static checkBuildSystemCompatibility(
    sourceAdapter: VersionAPIInterface,
    targetAdapter: VersionAPIInterface
  ): { breakingChanges: string[]; warnings: string[] } {
    const breakingChanges: string[] = [];
    const warnings: string[] = [];

    const sourceBuild = sourceAdapter.getBuildSystemConfiguration();
    const targetBuild = targetAdapter.getBuildSystemConfiguration();

    // Check Android Gradle Plugin version changes
    if (
      sourceBuild.android.gradlePluginVersion !==
      targetBuild.android.gradlePluginVersion
    ) {
      const sourceVersion = sourceBuild.android.gradlePluginVersion;
      const targetVersion = targetBuild.android.gradlePluginVersion;
      const sourceMajor = parseInt(sourceVersion.split('.')[0] || '0', 10);
      const targetMajor = parseInt(targetVersion.split('.')[0] || '0', 10);

      if (targetMajor > sourceMajor) {
        breakingChanges.push(
          `Android Gradle Plugin major version upgrade: ${sourceVersion} → ${targetVersion}`
        );
      } else {
        warnings.push(
          `Android Gradle Plugin version changed: ${sourceVersion} → ${targetVersion}`
        );
      }
    }

    // Check iOS deployment target changes
    if (sourceBuild.ios.deploymentTarget !== targetBuild.ios.deploymentTarget) {
      warnings.push(
        `iOS deployment target changed: ${sourceBuild.ios.deploymentTarget} → ${targetBuild.ios.deploymentTarget}`
      );
    }

    return { breakingChanges, warnings };
  }

  /**
   * Checks Architecture compatibility between versions
   */
  private static checkArchitectureCompatibility(
    sourceAdapter: VersionAPIInterface,
    targetAdapter: VersionAPIInterface
  ): { breakingChanges: string[]; warnings: string[] } {
    const breakingChanges: string[] = [];
    const warnings: string[] = [];

    const sourceArch = sourceAdapter.getArchitectureSupport();
    const targetArch = targetAdapter.getArchitectureSupport();

    // Check if new architecture support changed
    if (
      sourceArch.supportsNewArchitecture !== targetArch.supportsNewArchitecture
    ) {
      if (targetArch.supportsNewArchitecture) {
        warnings.push('New architecture support is now available');
      } else {
        breakingChanges.push('New architecture support has been removed');
      }
    }

    return { breakingChanges, warnings };
  }

  /**
   * Generates migration steps for version upgrade
   */
  private static generateMigrationSteps(
    sourceVersion: string,
    targetVersion: string,
    breakingChanges: string[]
  ): string[] {
    const steps: string[] = [];

    steps.push(
      `Migrating from React Native ${sourceVersion} to ${targetVersion}`
    );
    steps.push('1. Update package.json dependencies');
    steps.push('2. Run: npm install or yarn install');

    // Add steps based on breaking changes
    if (breakingChanges.some((change) => change.includes('Gradle Plugin'))) {
      steps.push(
        '3. Update Android Gradle Plugin version in android/build.gradle'
      );
      steps.push('4. Update gradle-wrapper.properties if needed');
    }

    if (breakingChanges.some((change) => change.includes('Codegen'))) {
      steps.push('5. Update Codegen configuration location');
      steps.push('6. Regenerate native code: npm run codegen');
    }

    steps.push('7. Clean build directories');
    steps.push('8. Rebuild the project');

    return steps;
  }
}

/**
 * Version API Interface
 * Defines the contract for version-specific API adapters
 */
export interface VersionAPIInterface {
  /**
   * Gets the React Native version this adapter supports
   */
  getVersion(): string;

  /**
   * Gets the Codegen configuration for this version
   */
  getCodegenConfiguration(): CodegenConfiguration;

  /**
   * Gets the build system configuration for this version
   */
  getBuildSystemConfiguration(): BuildSystemConfiguration;

  /**
   * Gets the architecture support information for this version
   */
  getArchitectureSupport(): ArchitectureSupport;

  /**
   * Configures the project for this version
   */
  configureProject(platform: 'android' | 'ios' | 'both'): void;

  /**
   * Validates the project configuration for this version
   */
  validateConfiguration(platform?: 'android' | 'ios'): ValidationResult;

  /**
   * Gets version-specific build commands
   */
  getBuildCommands(platform: 'android' | 'ios'): BuildCommands;

  /**
   * Gets version-specific dependency requirements
   */
  getDependencyRequirements(): DependencyRequirements;
}

/**
 * Codegen Configuration
 */
export interface CodegenConfiguration {
  android: {
    location: 'package.json' | 'build.gradle';
    javaPackageName: string;
    outputDir: string;
  };
  ios: {
    location: 'package.json' | 'podspec';
    moduleName: string;
    outputDir: string;
  };
}

/**
 * Build System Configuration
 */
export interface BuildSystemConfiguration {
  android: {
    gradlePluginVersion: string;
    kotlinVersion: string;
    compileSdkVersion: number;
    targetSdkVersion: number;
    minSdkVersion: number;
  };
  ios: {
    deploymentTarget: string;
    swiftVersion: string;
    xcodeVersion: string;
  };
}

/**
 * Architecture Support
 */
export interface ArchitectureSupport {
  supportsLegacyArchitecture: boolean;
  supportsNewArchitecture: boolean;
  defaultArchitecture: 'legacy' | 'new';
  architectureSwitchingSupported: boolean;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Build Commands
 */
export interface BuildCommands {
  clean: string;
  build: string;
  buildRelease: string;
  run: string;
}

/**
 * Dependency Requirements
 */
export interface DependencyRequirements {
  node: string;
  npm?: string;
  yarn?: string;
  android: {
    jdk: string;
    gradle: string;
  };
  ios: {
    cocoapods: string;
    xcode: string;
  };
}

/**
 * API Compatibility Result
 */
export interface APICompatibilityResult {
  isCompatible: boolean;
  breakingChanges: string[];
  warnings: string[];
  migrationSteps: string[];
}

/**
 * React Native 0.73 API Adapter
 */
class ReactNative073APIAdapter implements VersionAPIInterface {
  constructor(private version: string) {}

  getVersion(): string {
    return this.version;
  }

  getCodegenConfiguration(): CodegenConfiguration {
    return {
      android: {
        location: 'package.json',
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
      ios: {
        location: 'package.json',
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getBuildSystemConfiguration(): BuildSystemConfiguration {
    return {
      android: {
        gradlePluginVersion: '8.1.0',
        kotlinVersion: '1.8.0',
        compileSdkVersion: 34,
        targetSdkVersion: 34,
        minSdkVersion: 21,
      },
      ios: {
        deploymentTarget: '13.0',
        swiftVersion: '5.0',
        xcodeVersion: '15.0',
      },
    };
  }

  getArchitectureSupport(): ArchitectureSupport {
    return {
      supportsLegacyArchitecture: true,
      supportsNewArchitecture: true,
      defaultArchitecture: 'legacy',
      architectureSwitchingSupported: true,
    };
  }

  configureProject(platform: 'android' | 'ios' | 'both'): void {
    CrossPlatformBuildSystemAdapter.configureAndroidGradlePlugin(this.version);
    if (platform === 'ios' || platform === 'both') {
      CrossPlatformBuildSystemAdapter.configureIOSPodspec(this.version);
    }
  }

  validateConfiguration(platform?: 'android' | 'ios'): ValidationResult {
    return CrossPlatformBuildSystemAdapter.validateBuildEnvironment(platform)
      ? { isValid: true, errors: [], warnings: [] }
      : {
          isValid: false,
          errors: ['Build environment validation failed'],
          warnings: [],
        };
  }

  getBuildCommands(platform: 'android' | 'ios'): BuildCommands {
    if (platform === 'android') {
      return {
        clean: './gradlew clean',
        build: './gradlew assembleDebug',
        buildRelease: './gradlew assembleRelease',
        run: 'npx react-native run-android',
      };
    } else {
      return {
        clean: 'xcodebuild clean',
        build:
          'xcodebuild -workspace *.xcworkspace -scheme * -configuration Debug',
        buildRelease:
          'xcodebuild -workspace *.xcworkspace -scheme * -configuration Release',
        run: 'npx react-native run-ios',
      };
    }
  }

  getDependencyRequirements(): DependencyRequirements {
    return {
      node: '>=18.0.0',
      npm: '>=9.0.0',
      yarn: '>=1.22.0',
      android: {
        jdk: '17',
        gradle: '8.0',
      },
      ios: {
        cocoapods: '1.12.0',
        xcode: '15.0',
      },
    };
  }
}

/**
 * React Native 0.81 API Adapter
 */
class ReactNative081APIAdapter implements VersionAPIInterface {
  constructor(private version: string) {}

  getVersion(): string {
    return this.version;
  }

  getCodegenConfiguration(): CodegenConfiguration {
    return {
      android: {
        location: 'build.gradle',
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
      ios: {
        location: 'podspec',
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getBuildSystemConfiguration(): BuildSystemConfiguration {
    return {
      android: {
        gradlePluginVersion: '8.3.0',
        kotlinVersion: '1.9.0',
        compileSdkVersion: 34,
        targetSdkVersion: 34,
        minSdkVersion: 23,
      },
      ios: {
        deploymentTarget: '13.4',
        swiftVersion: '5.9',
        xcodeVersion: '15.3',
      },
    };
  }

  getArchitectureSupport(): ArchitectureSupport {
    return {
      supportsLegacyArchitecture: true,
      supportsNewArchitecture: true,
      defaultArchitecture: 'new',
      architectureSwitchingSupported: true,
    };
  }

  configureProject(platform: 'android' | 'ios' | 'both'): void {
    CrossPlatformBuildSystemAdapter.configureAndroidGradlePlugin(this.version);
    if (platform === 'ios' || platform === 'both') {
      CrossPlatformBuildSystemAdapter.configureIOSPodspec(this.version);
    }
  }

  validateConfiguration(platform?: 'android' | 'ios'): ValidationResult {
    return CrossPlatformBuildSystemAdapter.validateBuildEnvironment(platform)
      ? { isValid: true, errors: [], warnings: [] }
      : {
          isValid: false,
          errors: ['Build environment validation failed'],
          warnings: [],
        };
  }

  getBuildCommands(platform: 'android' | 'ios'): BuildCommands {
    if (platform === 'android') {
      return {
        clean: './gradlew clean',
        build: './gradlew assembleDebug',
        buildRelease: './gradlew assembleRelease',
        run: 'npx react-native run-android',
      };
    } else {
      return {
        clean: 'xcodebuild clean',
        build:
          'xcodebuild -workspace *.xcworkspace -scheme * -configuration Debug',
        buildRelease:
          'xcodebuild -workspace *.xcworkspace -scheme * -configuration Release',
        run: 'npx react-native run-ios',
      };
    }
  }

  getDependencyRequirements(): DependencyRequirements {
    return {
      node: '>=18.0.0',
      npm: '>=9.0.0',
      yarn: '>=1.22.0',
      android: {
        jdk: '17',
        gradle: '8.3',
      },
      ios: {
        cocoapods: '1.15.0',
        xcode: '15.3',
      },
    };
  }
}

/**
 * React Native 0.8x API Adapter
 */
class ReactNative08xAPIAdapter implements VersionAPIInterface {
  constructor(private version: string) {}

  getVersion(): string {
    return this.version;
  }

  getCodegenConfiguration(): CodegenConfiguration {
    return {
      android: {
        location: 'build.gradle',
        javaPackageName: 'com.jimmydaddy.imagemarker',
        outputDir: 'android/build/generated/source/codegen',
      },
      ios: {
        location: 'podspec',
        moduleName: 'RNImageMarkerSpec',
        outputDir: 'ios/build/generated/ios',
      },
    };
  }

  getBuildSystemConfiguration(): BuildSystemConfiguration {
    return {
      android: {
        gradlePluginVersion: '8.4.0',
        kotlinVersion: '1.9.22',
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        minSdkVersion: 24,
      },
      ios: {
        deploymentTarget: '14.0',
        swiftVersion: '5.10',
        xcodeVersion: '16.0',
      },
    };
  }

  getArchitectureSupport(): ArchitectureSupport {
    return {
      supportsLegacyArchitecture: true,
      supportsNewArchitecture: true,
      defaultArchitecture: 'new',
      architectureSwitchingSupported: true,
    };
  }

  configureProject(platform: 'android' | 'ios' | 'both'): void {
    CrossPlatformBuildSystemAdapter.configureAndroidGradlePlugin(this.version);
    if (platform === 'ios' || platform === 'both') {
      CrossPlatformBuildSystemAdapter.configureIOSPodspec(this.version);
    }
  }

  validateConfiguration(platform?: 'android' | 'ios'): ValidationResult {
    return CrossPlatformBuildSystemAdapter.validateBuildEnvironment(platform)
      ? { isValid: true, errors: [], warnings: [] }
      : {
          isValid: false,
          errors: ['Build environment validation failed'],
          warnings: [],
        };
  }

  getBuildCommands(platform: 'android' | 'ios'): BuildCommands {
    if (platform === 'android') {
      return {
        clean: './gradlew clean',
        build: './gradlew assembleDebug',
        buildRelease: './gradlew assembleRelease',
        run: 'npx react-native run-android',
      };
    } else {
      return {
        clean: 'xcodebuild clean',
        build:
          'xcodebuild -workspace *.xcworkspace -scheme * -configuration Debug',
        buildRelease:
          'xcodebuild -workspace *.xcworkspace -scheme * -configuration Release',
        run: 'npx react-native run-ios',
      };
    }
  }

  getDependencyRequirements(): DependencyRequirements {
    return {
      node: '>=18.0.0',
      npm: '>=10.0.0',
      yarn: '>=1.22.0',
      android: {
        jdk: '17',
        gradle: '8.4',
      },
      ios: {
        cocoapods: '1.16.0',
        xcode: '16.0',
      },
    };
  }
}
