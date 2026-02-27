import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformVersionDetector } from './CrossPlatformVersionDetector';

/**
 * Unified Codegen Configuration Manager
 * Manages synchronization between package.json and platform-specific Codegen configurations
 * Supports Android and iOS Codegen configuration differences
 * Validates specs/NativeImageMarker.ts specification file correctness
 */
export class CodegenConfigurationManager {
  private static readonly SPEC_FILE_PATH = 'specs/NativeImageMarker.ts';
  private static readonly PACKAGE_JSON_PATH = 'package.json';
  private static readonly ANDROID_BUILD_GRADLE_PATH = 'android/build.gradle';
  private static readonly IOS_PODSPEC_PATH =
    'react-native-image-marker.podspec';

  /**
   * Synchronizes package.json and platform-specific Codegen configurations
   * @param version React Native version (optional, will detect if not provided)
   */
  static syncCodegenConfigurations(version?: string): CodegenSyncResult {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();
    const result: CodegenSyncResult = {
      success: true,
      errors: [],
      warnings: [],
      syncedConfigurations: [],
    };

    try {
      // Validate spec file first
      const specValidation = this.validateSpecFile();
      if (!specValidation.isValid) {
        result.errors.push(...specValidation.errors);
        result.warnings.push(...specValidation.warnings);
        if (specValidation.errors.length > 0) {
          result.success = false;
          return result;
        }
      }

      // Get base configuration from package.json
      const packageConfig = this.getPackageJsonCodegenConfig();
      if (!packageConfig) {
        result.errors.push('No codegenConfig found in package.json');
        result.success = false;
        return result;
      }

      // Sync Android configuration
      const androidSync = this.syncAndroidCodegenConfig(
        packageConfig,
        targetVersion
      );
      result.syncedConfigurations.push(androidSync);
      if (!androidSync.success) {
        result.warnings.push(
          `Android sync issues: ${androidSync.issues.join(', ')}`
        );
      }

      // Sync iOS configuration
      const iosSync = this.syncIOSCodegenConfig(packageConfig, targetVersion);
      result.syncedConfigurations.push(iosSync);
      if (!iosSync.success) {
        result.warnings.push(`iOS sync issues: ${iosSync.issues.join(', ')}`);
      }

      // Update package.json with platform-specific differences
      this.updatePackageJsonWithPlatformDifferences(
        packageConfig,
        targetVersion
      );

      console.log('Codegen configurations synchronized successfully');
    } catch (error) {
      result.errors.push(`Failed to sync Codegen configurations: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Validates the specs/NativeImageMarker.ts specification file
   * @returns Validation result with detailed feedback
   */
  static validateSpecFile(): SpecFileValidationResult {
    const result: SpecFileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      specFileExists: false,
      interfaceValidation: {
        hasSpecInterface: false,
        hasCorrectMethods: false,
        hasCorrectTypes: false,
      },
    };

    const specPath = path.join(process.cwd(), this.SPEC_FILE_PATH);

    if (!fs.existsSync(specPath)) {
      result.errors.push(`Spec file not found: ${this.SPEC_FILE_PATH}`);
      result.isValid = false;
      return result;
    }

    result.specFileExists = true;

    try {
      const specContent = fs.readFileSync(specPath, 'utf8');

      // Validate Spec interface exists
      if (specContent.includes('export interface Spec extends TurboModule')) {
        result.interfaceValidation.hasSpecInterface = true;
      } else {
        result.errors.push('Spec interface extending TurboModule not found');
        result.isValid = false;
      }

      // Validate required methods exist
      const requiredMethods = ['markWithText', 'markWithImage'];
      const foundMethods = requiredMethods.filter(
        (method) =>
          specContent.includes(`${method}(`) &&
          specContent.includes('Promise<string>')
      );

      if (foundMethods.length === requiredMethods.length) {
        result.interfaceValidation.hasCorrectMethods = true;
      } else {
        const missingMethods = requiredMethods.filter(
          (method) => !foundMethods.includes(method)
        );
        result.errors.push(
          `Missing required methods: ${missingMethods.join(', ')}`
        );
        result.isValid = false;
      }

      // Validate required types exist
      const requiredTypes = [
        'TextMarkOptions',
        'ImageMarkOptions',
        'Position',
        'ImageFormat',
        'TextBackgroundType',
      ];
      const foundTypes = requiredTypes.filter(
        (type) =>
          specContent.includes(`export enum ${type}`) ||
          specContent.includes(`export interface ${type}`)
      );

      if (foundTypes.length === requiredTypes.length) {
        result.interfaceValidation.hasCorrectTypes = true;
      } else {
        const missingTypes = requiredTypes.filter(
          (type) => !foundTypes.includes(type)
        );
        result.warnings.push(
          `Missing or incorrectly defined types: ${missingTypes.join(', ')}`
        );
      }

      // Validate TurboModuleRegistry usage
      if (!specContent.includes('TurboModuleRegistry.getEnforcing<Spec>')) {
        result.errors.push('TurboModuleRegistry.getEnforcing<Spec> not found');
        result.isValid = false;
      }

      // Validate export default
      if (
        !specContent.includes(
          "export default TurboModuleRegistry.getEnforcing<Spec>('ImageMarker')"
        )
      ) {
        result.warnings.push(
          'Expected export default with module name "ImageMarker"'
        );
      }
    } catch (error) {
      result.errors.push(`Failed to read or parse spec file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Supports Android and iOS Codegen configuration differences
   * @param version React Native version
   * @returns Platform-specific configuration differences
   */
  static getPlatformSpecificCodegenDifferences(
    version: string
  ): PlatformCodegenDifferences {
    const differences: PlatformCodegenDifferences = {
      android: {
        configLocation: this.getAndroidCodegenConfigLocation(version),
        outputDir: this.getAndroidOutputDir(version),
        javaPackageName: 'com.jimmydaddy.imagemarker',
        additionalSettings: {},
      },
      ios: {
        configLocation: this.getIOSCodegenConfigLocation(version),
        outputDir: this.getIOSOutputDir(version),
        moduleName: 'RNImageMarkerSpec',
        additionalSettings: {},
      },
      shared: {
        specFiles: [this.SPEC_FILE_PATH],
        jsSrcsDir: 'specs',
        type: 'modules' as const,
      },
    };

    // Version-specific differences
    if (this.isVersion073OrLater(version)) {
      differences.android.additionalSettings.useNewCodegenLocation = true;
      differences.ios.additionalSettings.useNewCodegenLocation = true;
    }

    if (this.isVersion081OrLater(version)) {
      differences.android.additionalSettings.supportsFabric = true;
      differences.ios.additionalSettings.supportsFabric = true;
      differences.shared.fabricEnabled = true;
    }

    return differences;
  }

  /**
   * Gets package.json codegenConfig
   * @returns Codegen configuration from package.json
   */
  private static getPackageJsonCodegenConfig(): PackageJsonCodegenConfig | null {
    const packageJsonPath = path.join(process.cwd(), this.PACKAGE_JSON_PATH);

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.codegenConfig || null;
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
      return null;
    }
  }

  /**
   * Synchronizes Android Codegen configuration
   * @param baseConfig Base configuration from package.json
   * @param version React Native version
   * @returns Android sync result
   */
  private static syncAndroidCodegenConfig(
    baseConfig: PackageJsonCodegenConfig,
    version: string
  ): PlatformSyncResult {
    const result: PlatformSyncResult = {
      platform: 'android',
      success: true,
      issues: [],
      appliedChanges: [],
    };

    try {
      const configLocation = this.getAndroidCodegenConfigLocation(version);

      if (configLocation === 'build.gradle') {
        // For newer versions, ensure build.gradle has correct Codegen configuration
        const buildGradlePath = path.join(
          process.cwd(),
          this.ANDROID_BUILD_GRADLE_PATH
        );

        if (fs.existsSync(buildGradlePath)) {
          const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

          // Check if react block exists and has codegenConfig
          if (
            !buildGradleContent.includes('react {') ||
            !buildGradleContent.includes('codegenConfig')
          ) {
            result.issues.push(
              'Android build.gradle missing react.codegenConfig block'
            );

            // Add or update react block with codegenConfig
            this.updateAndroidBuildGradleCodegenConfig(
              buildGradlePath,
              baseConfig
            );
            result.appliedChanges.push(
              'Added/updated react.codegenConfig in build.gradle'
            );
          }
        } else {
          result.issues.push('Android build.gradle not found');
          result.success = false;
        }
      }

      // Ensure Android-specific output directory is correct
      const expectedOutputDir = this.getAndroidOutputDir(version);
      if (baseConfig.android?.outputDir !== expectedOutputDir) {
        result.issues.push(
          `Android outputDir mismatch: expected ${expectedOutputDir}, got ${baseConfig.android?.outputDir}`
        );
      }
    } catch (error) {
      result.issues.push(`Android sync error: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Synchronizes iOS Codegen configuration
   * @param baseConfig Base configuration from package.json
   * @param version React Native version
   * @returns iOS sync result
   */
  private static syncIOSCodegenConfig(
    baseConfig: PackageJsonCodegenConfig,
    version: string
  ): PlatformSyncResult {
    const result: PlatformSyncResult = {
      platform: 'ios',
      success: true,
      issues: [],
      appliedChanges: [],
    };

    try {
      const configLocation = this.getIOSCodegenConfigLocation(version);

      if (configLocation === 'podspec') {
        // For newer versions, ensure podspec has correct Codegen configuration
        const podspecPath = path.join(process.cwd(), this.IOS_PODSPEC_PATH);

        if (fs.existsSync(podspecPath)) {
          const podspecContent = fs.readFileSync(podspecPath, 'utf8');

          // Check if podspec has new architecture support
          if (
            !podspecContent.includes('install_modules_dependencies') &&
            this.isVersion073OrLater(version)
          ) {
            result.issues.push('iOS podspec missing new architecture support');

            // Update podspec with new architecture support
            this.updateIOSPodspecCodegenConfig(
              podspecPath,
              baseConfig,
              version
            );
            result.appliedChanges.push(
              'Added new architecture support to podspec'
            );
          }
        } else {
          result.issues.push('iOS podspec not found');
          result.success = false;
        }
      }

      // Ensure iOS-specific output directory is correct
      const expectedOutputDir = this.getIOSOutputDir(version);
      if (baseConfig.ios?.outputDir !== expectedOutputDir) {
        result.issues.push(
          `iOS outputDir mismatch: expected ${expectedOutputDir}, got ${baseConfig.ios?.outputDir}`
        );
      }
    } catch (error) {
      result.issues.push(`iOS sync error: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Updates package.json with platform-specific differences
   * @param baseConfig Base configuration
   * @param version React Native version
   */
  private static updatePackageJsonWithPlatformDifferences(
    baseConfig: PackageJsonCodegenConfig,
    version: string
  ): void {
    const packageJsonPath = path.join(process.cwd(), this.PACKAGE_JSON_PATH);

    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const differences = this.getPlatformSpecificCodegenDifferences(version);

      // Update with platform-specific settings
      packageJson.codegenConfig = {
        ...baseConfig,
        name: baseConfig.name || 'RNImageMarkerSpec',
        type: differences.shared.type,
        jsSrcsDir: differences.shared.jsSrcsDir,
        android: {
          ...baseConfig.android,
          javaPackageName: differences.android.javaPackageName,
          outputDir: differences.android.outputDir,
        },
        ios: {
          ...baseConfig.ios,
          moduleName: differences.ios.moduleName,
          outputDir: differences.ios.outputDir,
        },
      };

      // Add version-specific settings
      if (differences.shared.fabricEnabled) {
        packageJson.codegenConfig.fabricEnabled = true;
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      console.warn(
        'Failed to update package.json with platform differences:',
        error
      );
    }
  }

  /**
   * Updates Android build.gradle with Codegen configuration
   * @param buildGradlePath Path to build.gradle file
   * @param config Codegen configuration
   */
  private static updateAndroidBuildGradleCodegenConfig(
    buildGradlePath: string,
    config: PackageJsonCodegenConfig
  ): void {
    let content = fs.readFileSync(buildGradlePath, 'utf8');

    const reactBlock = `
react {
    codegenConfig {
        name = "${config.name || 'RNImageMarkerSpec'}"
        type = "${config.type || 'modules'}"
        jsSrcsDir = "${config.jsSrcsDir || 'src'}"
        android {
            javaPackageName = "${
              config.android?.javaPackageName || 'com.jimmydaddy.imagemarker'
            }"
            outputDir = "${
              config.android?.outputDir ||
              'android/build/generated/source/codegen'
            }"
        }
    }
}`;

    // Check if react block already exists
    if (content.includes('react {')) {
      // Replace existing react block
      content = content.replace(/react\s*\{[^}]*\}/s, reactBlock.trim());
    } else {
      // Add react block at the end
      content += '\n' + reactBlock + '\n';
    }

    fs.writeFileSync(buildGradlePath, content);
  }

  /**
   * Updates iOS podspec with Codegen configuration
   * @param podspecPath Path to podspec file
   * @param config Codegen configuration
   * @param version React Native version
   */
  private static updateIOSPodspecCodegenConfig(
    podspecPath: string,
    _config: PackageJsonCodegenConfig,
    version: string
  ): void {
    let content = fs.readFileSync(podspecPath, 'utf8');

    // Add new architecture support if version 0.73 or later
    if (
      this.isVersion073OrLater(version) &&
      !content.includes('install_modules_dependencies')
    ) {
      const newArchSupport = `
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    s.pod_target_xcconfig = {
      "HEADER_SEARCH_PATHS" => "\\"$(PODS_ROOT)/boost\\" \\"$(PODS_ROOT)/boost-for-react-native\\" \\"$(PODS_ROOT)/RCT-Folly\\" \\"$(PODS_ROOT)/Headers/Private/React-Core\\"",
      "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
  end`;

      // Insert before the end of the spec
      content = content.replace(/^end\s*$/m, newArchSupport + '\nend');
    }

    fs.writeFileSync(podspecPath, content);
  }

  /**
   * Gets Android Codegen configuration location based on version
   * @param version React Native version
   * @returns Configuration location
   */
  private static getAndroidCodegenConfigLocation(
    version: string
  ): 'package.json' | 'build.gradle' {
    return this.isVersion073OrLater(version) ? 'build.gradle' : 'package.json';
  }

  /**
   * Gets iOS Codegen configuration location based on version
   * @param version React Native version
   * @returns Configuration location
   */
  private static getIOSCodegenConfigLocation(
    version: string
  ): 'package.json' | 'podspec' {
    return this.isVersion073OrLater(version) ? 'podspec' : 'package.json';
  }

  /**
   * Gets Android output directory based on version
   * @param version React Native version
   * @returns Output directory path
   */
  private static getAndroidOutputDir(version: string): string {
    return this.isVersion073OrLater(version)
      ? 'android/build/generated/source/codegen'
      : 'android/build/generated/source/codegen';
  }

  /**
   * Gets iOS output directory based on version
   * @param version React Native version
   * @returns Output directory path
   */
  private static getIOSOutputDir(version: string): string {
    return this.isVersion073OrLater(version)
      ? 'ios/build/generated/ios'
      : 'ios/build/generated/ios';
  }

  /**
   * Checks if version is 0.73 or later
   * @param version React Native version
   * @returns True if version is 0.73 or later
   */
  private static isVersion073OrLater(version: string): boolean {
    const versionMatch = version.match(/^(\d+)\.(\d+)/);
    if (!versionMatch) return false;

    const major = parseInt(versionMatch[1]!, 10);
    const minor = parseInt(versionMatch[2]!, 10);

    return major > 0 || (major === 0 && minor >= 73);
  }

  /**
   * Checks if version is 0.81 or later
   * @param version React Native version
   * @returns True if version is 0.81 or later
   */
  private static isVersion081OrLater(version: string): boolean {
    const versionMatch = version.match(/^(\d+)\.(\d+)/);
    if (!versionMatch) return false;

    const major = parseInt(versionMatch[1]!, 10);
    const minor = parseInt(versionMatch[2]!, 10);

    return major > 0 || (major === 0 && minor >= 81);
  }
}

// Type definitions
export interface CodegenSyncResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  syncedConfigurations: PlatformSyncResult[];
}

export interface SpecFileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  specFileExists: boolean;
  interfaceValidation: {
    hasSpecInterface: boolean;
    hasCorrectMethods: boolean;
    hasCorrectTypes: boolean;
  };
}

export interface PlatformSyncResult {
  platform: 'android' | 'ios';
  success: boolean;
  issues: string[];
  appliedChanges: string[];
}

export interface PlatformCodegenDifferences {
  android: {
    configLocation: 'package.json' | 'build.gradle';
    outputDir: string;
    javaPackageName: string;
    additionalSettings: Record<string, any>;
  };
  ios: {
    configLocation: 'package.json' | 'podspec';
    outputDir: string;
    moduleName: string;
    additionalSettings: Record<string, any>;
  };
  shared: {
    specFiles: string[];
    jsSrcsDir: string;
    type: 'modules' | 'components' | 'all';
    fabricEnabled?: boolean;
  };
}

export interface PackageJsonCodegenConfig {
  name?: string;
  type?: 'modules' | 'components' | 'all';
  jsSrcsDir?: string;
  android?: {
    javaPackageName?: string;
    outputDir?: string;
  };
  ios?: {
    moduleName?: string;
    outputDir?: string;
  };
}
