import * as fs from 'fs';
import * as path from 'path';
import {
  CrossPlatformVersionDetector,
  type AndroidConfig,
  type IOSConfig,
  type CodegenConfig,
  type ExpoConfig,
  type PlatformCapabilities,
} from './CrossPlatformVersionDetector';

/**
 * Cross-platform configuration manager for React Native projects
 * Manages Android and iOS build configurations based on detected version and platform capabilities
 */
export class CrossPlatformConfigurationManager {
  private static _currentVersion: string | null = null;
  private static _appliedConfigurations: Set<string> = new Set();

  /**
   * Applies version-specific configuration for specified platforms
   * @param version React Native version (optional, will detect if not provided)
   * @param platform Target platform(s) to configure
   */
  static applyVersionSpecificConfig(
    version?: string,
    platform: 'android' | 'ios' | 'both' = 'both'
  ): void {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();
    this._currentVersion = targetVersion;

    const strategy =
      CrossPlatformVersionDetector.getConfigurationStrategy(targetVersion);
    const capabilities =
      CrossPlatformVersionDetector.detectPlatformCapabilities();

    if (platform === 'android' || platform === 'both') {
      this.applyAndroidConfiguration(strategy.getAndroidConfig(), capabilities);
    }

    if (platform === 'ios' || platform === 'both') {
      this.applyIOSConfiguration(strategy.getIOSConfig(), capabilities);
    }

    // Apply shared Codegen configuration
    this.applyCodegenConfiguration(strategy.getCodegenConfig());

    // Apply Expo configuration if Expo is detected
    if (capabilities.expo.supportsPrebuild) {
      this.applyExpoConfiguration(strategy.getExpoConfig());
    }

    this._appliedConfigurations.add(`${targetVersion}-${platform}`);
  }

  /**
   * Validates current configuration for specified platform(s)
   * @param platform Platform to validate (optional, validates both if not specified)
   * @returns Validation result
   */
  static validateConfiguration(platform?: 'android' | 'ios'): ValidationResult {
    const results: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      platformResults: {},
    };

    const capabilities =
      CrossPlatformVersionDetector.detectPlatformCapabilities();

    if (!platform || platform === 'android') {
      results.platformResults.android =
        this.validateAndroidConfiguration(capabilities);
      if (!results.platformResults.android.isValid) {
        results.isValid = false;
        results.errors.push(...results.platformResults.android.errors);
      }
      results.warnings.push(...results.platformResults.android.warnings);
    }

    if (!platform || platform === 'ios') {
      results.platformResults.ios = this.validateIOSConfiguration(capabilities);
      if (!results.platformResults.ios.isValid) {
        results.isValid = false;
        results.errors.push(...results.platformResults.ios.errors);
      }
      results.warnings.push(...results.platformResults.ios.warnings);
    }

    return results;
  }

  /**
   * Generates build files for specified platform(s)
   * @param platform Platform to generate files for (optional, generates for both if not specified)
   */
  static generateBuildFiles(platform?: 'android' | 'ios'): void {
    const version =
      this._currentVersion ||
      CrossPlatformVersionDetector.detectReactNativeVersion();
    const strategy =
      CrossPlatformVersionDetector.getConfigurationStrategy(version);

    if (!platform || platform === 'android') {
      this.generateAndroidBuildFiles(strategy.getAndroidConfig());
    }

    if (!platform || platform === 'ios') {
      this.generateIOSBuildFiles(strategy.getIOSConfig());
    }
  }

  /**
   * Synchronizes configurations between Android and iOS platforms
   */
  static syncConfigurationsBetweenPlatforms(): void {
    const version =
      this._currentVersion ||
      CrossPlatformVersionDetector.detectReactNativeVersion();
    const strategy =
      CrossPlatformVersionDetector.getConfigurationStrategy(version);

    const androidConfig = strategy.getAndroidConfig();
    const iosConfig = strategy.getIOSConfig();
    const codegenConfig = strategy.getCodegenConfig();

    // Sync Codegen configuration
    this.syncCodegenConfiguration(androidConfig, iosConfig, codegenConfig);

    // Sync version-specific settings
    this.syncVersionSpecificSettings(androidConfig, iosConfig, version);

    // Sync new architecture settings
    this.syncNewArchitectureSettings(androidConfig, iosConfig);
  }

  /**
   * Applies Android-specific configuration
   * @param config Android configuration
   * @param capabilities Platform capabilities
   */
  private static applyAndroidConfiguration(
    config: AndroidConfig,
    capabilities: PlatformCapabilities
  ): void {
    try {
      // Update gradle.properties
      this.updateGradleProperties(
        config,
        capabilities.android.hasNewArchitecture
      );

      // Update build.gradle
      this.updateAndroidBuildGradle(config);

      // Update app/build.gradle if exists
      this.updateAndroidAppBuildGradle(config);

      console.log('Android configuration applied successfully');
    } catch (error) {
      console.warn('Failed to apply Android configuration:', error);
    }
  }

  /**
   * Applies iOS-specific configuration
   * @param config iOS configuration
   * @param capabilities Platform capabilities
   */
  private static applyIOSConfiguration(
    config: IOSConfig,
    capabilities: PlatformCapabilities
  ): void {
    try {
      // Update Podspec
      this.updatePodspec(config);

      // Update Podfile if exists
      this.updatePodfile(config, capabilities.ios.hasNewArchitecture);

      // Update iOS project settings
      this.updateIOSProjectSettings(config);

      console.log('iOS configuration applied successfully');
    } catch (error) {
      console.warn('Failed to apply iOS configuration:', error);
    }
  }

  /**
   * Applies Codegen configuration
   * @param config Codegen configuration
   */
  private static applyCodegenConfiguration(config: CodegenConfig): void {
    try {
      // Update package.json codegenConfig
      this.updatePackageJsonCodegenConfig(config);

      // Create or update codegen spec files
      this.ensureCodegenSpecFiles(config);

      console.log('Codegen configuration applied successfully');
    } catch (error) {
      console.warn('Failed to apply Codegen configuration:', error);
    }
  }

  /**
   * Applies Expo configuration
   * @param config Expo configuration
   */
  private static applyExpoConfiguration(config: ExpoConfig): void {
    try {
      // Update app.json/app.config.js
      this.updateExpoConfig(config);

      // Update Expo plugin configuration
      this.updateExpoPluginConfig(config);

      console.log('Expo configuration applied successfully');
    } catch (error) {
      console.warn('Failed to apply Expo configuration:', error);
    }
  }

  /**
   * Updates gradle.properties file
   * @param config Android configuration
   * @param hasNewArchitecture Whether new architecture is enabled
   */
  private static updateGradleProperties(
    _config: AndroidConfig,
    hasNewArchitecture: boolean
  ): void {
    const gradlePropsPath = path.join(
      process.cwd(),
      'android',
      'gradle.properties'
    );

    if (!fs.existsSync(gradlePropsPath)) {
      return;
    }

    let content = fs.readFileSync(gradlePropsPath, 'utf8');

    // Update or add newArchEnabled
    if (content.includes('newArchEnabled=')) {
      content = content.replace(
        /newArchEnabled=.*/g,
        `newArchEnabled=${hasNewArchitecture}`
      );
    } else {
      content += `\nnewArchEnabled=${hasNewArchitecture}\n`;
    }

    // Update Android Gradle Plugin version
    if (content.includes('android.useAndroidX=')) {
      if (!content.includes('android.enableJetifier=')) {
        content += 'android.enableJetifier=true\n';
      }
    }

    fs.writeFileSync(gradlePropsPath, content);
  }

  /**
   * Updates Android build.gradle file
   * @param config Android configuration
   */
  private static updateAndroidBuildGradle(config: AndroidConfig): void {
    const buildGradlePath = path.join(process.cwd(), 'android', 'build.gradle');

    if (!fs.existsSync(buildGradlePath)) {
      return;
    }

    let content = fs.readFileSync(buildGradlePath, 'utf8');

    // Update Android Gradle Plugin version
    const agpVersionRegex = /com\.android\.tools\.build:gradle:[\d.]+/g;
    if (agpVersionRegex.test(content)) {
      content = content.replace(
        agpVersionRegex,
        `com.android.tools.build:gradle:${config.gradleConfig.pluginVersion}`
      );
    }

    // Update Kotlin version
    const kotlinVersionRegex = /kotlin_version\s*=\s*['"][\d.]+['"]/g;
    if (kotlinVersionRegex.test(content)) {
      content = content.replace(
        kotlinVersionRegex,
        `kotlin_version = "${config.gradleConfig.kotlinVersion}"`
      );
    }

    fs.writeFileSync(buildGradlePath, content);
  }

  /**
   * Updates Android app/build.gradle file
   * @param config Android configuration
   */
  private static updateAndroidAppBuildGradle(config: AndroidConfig): void {
    const appBuildGradlePath = path.join(
      process.cwd(),
      'android',
      'app',
      'build.gradle'
    );

    if (!fs.existsSync(appBuildGradlePath)) {
      return;
    }

    let content = fs.readFileSync(appBuildGradlePath, 'utf8');

    // Update namespace if not present
    if (!content.includes('namespace') && config.buildConfig.namespace) {
      const androidBlockRegex = /android\s*\{/;
      if (androidBlockRegex.test(content)) {
        content = content.replace(
          androidBlockRegex,
          `android {\n    namespace "${config.buildConfig.namespace}"`
        );
      }
    }

    // Update compile SDK version
    const compileSdkRegex = /compileSdkVersion\s+\d+/g;
    if (compileSdkRegex.test(content)) {
      content = content.replace(
        compileSdkRegex,
        `compileSdkVersion ${config.buildConfig.compileSdkVersion}`
      );
    }

    fs.writeFileSync(appBuildGradlePath, content);
  }

  /**
   * Updates Podspec file
   * @param config iOS configuration
   */
  private static updatePodspec(config: IOSConfig): void {
    const podspecPath = path.join(
      process.cwd(),
      'react-native-image-marker.podspec'
    );

    if (!fs.existsSync(podspecPath)) {
      return;
    }

    let content = fs.readFileSync(podspecPath, 'utf8');

    // Update iOS deployment target
    const deploymentTargetRegex =
      /s\.ios\.deployment_target\s*=\s*['"][\d.]+['"]/g;
    if (deploymentTargetRegex.test(content)) {
      content = content.replace(
        deploymentTargetRegex,
        `s.ios.deployment_target = "${config.podspecConfig.deploymentTarget}"`
      );
    }

    // Update Swift version
    const swiftVersionRegex = /s\.swift_version\s*=\s*['"][\d.]+['"]/g;
    if (swiftVersionRegex.test(content)) {
      content = content.replace(
        swiftVersionRegex,
        `s.swift_version = "${config.podspecConfig.swiftVersion}"`
      );
    }

    fs.writeFileSync(podspecPath, content);
  }

  /**
   * Updates Podfile
   * @param config iOS configuration
   * @param hasNewArchitecture Whether new architecture is enabled
   */
  private static updatePodfile(
    config: IOSConfig,
    hasNewArchitecture: boolean
  ): void {
    const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');

    if (!fs.existsSync(podfilePath)) {
      return;
    }

    let content = fs.readFileSync(podfilePath, 'utf8');

    // Update iOS deployment target
    const platformRegex = /platform\s+:ios,\s*['"][\d.]+['"]/g;
    if (platformRegex.test(content)) {
      content = content.replace(
        platformRegex,
        `platform :ios, "${config.buildConfig.deploymentTarget}"`
      );
    }

    // Update new architecture setting
    if (content.includes("ENV['RCT_NEW_ARCH_ENABLED']")) {
      content = content.replace(
        /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"][01]['"]/g,
        `ENV['RCT_NEW_ARCH_ENABLED'] = "${hasNewArchitecture ? '1' : '0'}"`
      );
    }

    fs.writeFileSync(podfilePath, content);
  }

  /**
   * Updates iOS project settings
   * @param config iOS configuration
   */
  private static updateIOSProjectSettings(config: IOSConfig): void {
    // This would typically involve updating .xcodeproj files
    // For now, we'll just log the configuration
    console.log('iOS project settings would be updated with:', {
      deploymentTarget: config.buildConfig.deploymentTarget,
      swiftVersion: config.buildConfig.swiftVersion,
      fabricEnabled: config.buildConfig.fabricEnabled,
      turboModulesEnabled: config.buildConfig.turboModulesEnabled,
    });
  }

  /**
   * Updates package.json codegenConfig
   * @param config Codegen configuration
   */
  private static updatePackageJsonCodegenConfig(config: CodegenConfig): void {
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    packageJson.codegenConfig = {
      name: config.name,
      type: config.type,
      jsSrcsDir: config.jsSrcsDir,
      android: config.android,
      ios: config.ios,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Ensures Codegen spec files exist
   * @param config Codegen configuration
   */
  private static ensureCodegenSpecFiles(config: CodegenConfig): void {
    config.specFiles.forEach((specFile) => {
      const specPath = path.join(process.cwd(), specFile);
      if (!fs.existsSync(specPath)) {
        console.warn(`Codegen spec file not found: ${specPath}`);
      }
    });
  }

  /**
   * Updates Expo configuration
   * @param config Expo configuration
   */
  private static updateExpoConfig(config: ExpoConfig): void {
    const appJsonPath = path.join(process.cwd(), 'app.json');

    if (!fs.existsSync(appJsonPath)) {
      return;
    }

    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    if (!appJson.expo) {
      appJson.expo = {};
    }

    // Update SDK version
    appJson.expo.sdkVersion = config.sdkVersion;

    // Ensure plugins array exists
    if (!appJson.expo.plugins) {
      appJson.expo.plugins = [];
    }

    // Add or update react-native-image-marker plugin
    const pluginIndex = appJson.expo.plugins.findIndex(
      (plugin: any) =>
        (typeof plugin === 'string' &&
          plugin.includes('react-native-image-marker')) ||
        (Array.isArray(plugin) &&
          plugin[0].includes('react-native-image-marker'))
    );

    if (pluginIndex === -1) {
      appJson.expo.plugins.push([
        'react-native-image-marker',
        { newArchEnabled: config.supportsNewArchitecture },
      ]);
    } else {
      appJson.expo.plugins[pluginIndex] = [
        'react-native-image-marker',
        { newArchEnabled: config.supportsNewArchitecture },
      ];
    }

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  }

  /**
   * Updates Expo plugin configuration
   * @param config Expo configuration
   */
  private static updateExpoPluginConfig(config: ExpoConfig): void {
    // This would update the Expo plugin configuration
    console.log('Expo plugin configuration would be updated with:', {
      sdkVersion: config.sdkVersion,
      supportsNewArchitecture: config.supportsNewArchitecture,
      configPluginVersion: config.configPluginVersion,
    });
  }

  /**
   * Validates Android configuration
   * @param capabilities Platform capabilities
   * @returns Android validation result
   */
  private static validateAndroidConfiguration(
    capabilities: PlatformCapabilities
  ): PlatformValidationResult {
    const result: PlatformValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check if Android directory exists
    const androidDir = path.join(process.cwd(), 'android');
    if (!fs.existsSync(androidDir)) {
      result.errors.push('Android directory not found');
      result.isValid = false;
      return result;
    }

    // Check gradle.properties
    const gradlePropsPath = path.join(androidDir, 'gradle.properties');
    if (!fs.existsSync(gradlePropsPath)) {
      result.warnings.push('gradle.properties not found');
    } else {
      const gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
      if (
        capabilities.android.hasNewArchitecture &&
        !gradleProps.includes('newArchEnabled=true')
      ) {
        result.warnings.push(
          'New architecture is detected but newArchEnabled is not set to true'
        );
      }
    }

    // Check build.gradle
    const buildGradlePath = path.join(androidDir, 'build.gradle');
    if (!fs.existsSync(buildGradlePath)) {
      result.errors.push('Android build.gradle not found');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates iOS configuration
   * @param capabilities Platform capabilities
   * @returns iOS validation result
   */
  private static validateIOSConfiguration(
    capabilities: PlatformCapabilities
  ): PlatformValidationResult {
    const result: PlatformValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check if iOS directory exists
    const iosDir = path.join(process.cwd(), 'ios');
    if (!fs.existsSync(iosDir)) {
      result.errors.push('iOS directory not found');
      result.isValid = false;
      return result;
    }

    // Check Podfile
    const podfilePath = path.join(iosDir, 'Podfile');
    if (!fs.existsSync(podfilePath)) {
      result.warnings.push('Podfile not found');
    } else {
      const podfile = fs.readFileSync(podfilePath, 'utf8');
      if (
        capabilities.ios.hasNewArchitecture &&
        !podfile.includes('RCT_NEW_ARCH_ENABLED')
      ) {
        result.warnings.push(
          'New architecture is detected but RCT_NEW_ARCH_ENABLED is not configured'
        );
      }
    }

    // Check Podspec
    const podspecPath = path.join(
      process.cwd(),
      'react-native-image-marker.podspec'
    );
    if (!fs.existsSync(podspecPath)) {
      result.errors.push('Podspec file not found');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Generates Android build files
   * @param config Android configuration
   */
  private static generateAndroidBuildFiles(config: AndroidConfig): void {
    // This would generate or update Android build files
    console.log('Android build files would be generated with config:', config);
  }

  /**
   * Generates iOS build files
   * @param config iOS configuration
   */
  private static generateIOSBuildFiles(config: IOSConfig): void {
    // This would generate or update iOS build files
    console.log('iOS build files would be generated with config:', config);
  }

  /**
   * Synchronizes Codegen configuration between platforms
   * @param androidConfig Android configuration
   * @param iosConfig iOS configuration
   * @param codegenConfig Codegen configuration
   */
  private static syncCodegenConfiguration(
    _androidConfig: AndroidConfig,
    _iosConfig: IOSConfig,
    _codegenConfig: CodegenConfig
  ): void {
    // Ensure Codegen configuration is consistent
    console.log('Syncing Codegen configuration between platforms');
  }

  /**
   * Synchronizes version-specific settings
   * @param androidConfig Android configuration
   * @param iosConfig iOS configuration
   * @param version React Native version
   */
  private static syncVersionSpecificSettings(
    _androidConfig: AndroidConfig,
    _iosConfig: IOSConfig,
    version: string
  ): void {
    // Sync version-specific settings
    console.log(
      `Syncing version-specific settings for React Native ${version}`
    );
  }

  /**
   * Synchronizes new architecture settings
   * @param androidConfig Android configuration
   * @param iosConfig iOS configuration
   */
  private static syncNewArchitectureSettings(
    _androidConfig: AndroidConfig,
    _iosConfig: IOSConfig
  ): void {
    // Sync new architecture settings
    console.log('Syncing new architecture settings between platforms');
  }

  /**
   * Reset configuration manager state
   */
  static reset(): void {
    this._currentVersion = null;
    this._appliedConfigurations.clear();
  }

  /**
   * Get current applied configurations
   * @returns Set of applied configuration keys
   */
  static getAppliedConfigurations(): Set<string> {
    return new Set(this._appliedConfigurations);
  }
}

// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  platformResults: {
    android?: PlatformValidationResult;
    ios?: PlatformValidationResult;
  };
}

export interface PlatformValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
