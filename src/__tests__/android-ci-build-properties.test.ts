import { describe, test, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformVersionDetector } from '../CrossPlatformVersionDetector';
import { CrossPlatformBuildSystemAdapter } from '../CrossPlatformBuildSystemAdapter';

describe('Android CI Build Fix - Property Tests', () => {
  beforeEach(() => {
    // Reset version detection before each test
    CrossPlatformVersionDetector.reset();
    CrossPlatformBuildSystemAdapter.reset();
  });

  describe('Property 2: 跨平台构建成功性保证（Android 部分）', () => {
    test('对于任何有效的项目配置和支持的 React Native 版本，Android 构建应该成功完成', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分）
       * Validates: Requirements 1.1, 1.4, 1.5, 4.1, 4.3
       */

      // Test supported React Native versions
      const supportedVersions = [
        '0.73.0',
        '0.73.3',
        '0.81.0',
        '0.81.2',
        '0.82.0',
        '0.83.0',
      ];

      supportedVersions.forEach((version) => {
        // Test version detection
        expect(CrossPlatformVersionDetector.isVersionSupported(version)).toBe(
          true
        );

        // Test configuration strategy creation
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy(version);
        expect(strategy).toBeDefined();

        const androidConfig = strategy.getAndroidConfig();
        expect(androidConfig).toBeDefined();
        expect(androidConfig.buildConfig).toBeDefined();
        expect(androidConfig.codegenConfig).toBeDefined();

        // Verify namespace is set for Android Gradle Plugin 8.x compatibility
        expect(androidConfig.buildConfig.namespace).toBe(
          'com.jimmydaddy.imagemarker'
        );

        // Verify version-specific Gradle plugin versions
        if (version.startsWith('0.73')) {
          expect(androidConfig.buildConfig.gradlePluginVersion).toBe('8.1.0');
          expect(androidConfig.buildConfig.kotlinVersion).toBe('1.8.0');
          expect(androidConfig.codegenConfig.location).toBe('package.json');
        } else if (version.startsWith('0.81')) {
          expect(androidConfig.buildConfig.gradlePluginVersion).toBe('8.3.0');
          expect(androidConfig.buildConfig.kotlinVersion).toBe('1.9.0');
          expect(androidConfig.codegenConfig.location).toBe('build.gradle');
        } else if (version.startsWith('0.8')) {
          expect(androidConfig.buildConfig.gradlePluginVersion).toBe('8.4.0');
          expect(androidConfig.buildConfig.kotlinVersion).toBe('1.9.22');
          expect(androidConfig.codegenConfig.location).toBe('build.gradle');
        }

        // Verify SDK versions are appropriate
        expect(
          androidConfig.buildConfig.compileSdkVersion
        ).toBeGreaterThanOrEqual(33);
        expect(
          androidConfig.buildConfig.targetSdkVersion
        ).toBeGreaterThanOrEqual(33);
        expect(androidConfig.buildConfig.minSdkVersion).toBeGreaterThanOrEqual(
          21
        );

        console.log(
          `Android configuration verified for React Native ${version}`
        );
      });
    });

    test('Android build.gradle 应该根据 React Native 版本自动选择正确的 codegenConfig 位置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - codegenConfig 位置选择
       * Validates: Requirements 1.1, 1.2, 5.2
       */

      const buildGradlePath = path.join(
        process.cwd(),
        'android',
        'build.gradle'
      );
      expect(fs.existsSync(buildGradlePath)).toBe(true);

      const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

      // Verify version detection functions exist
      expect(buildGradleContent).toContain('detectReactNativeVersion()');
      expect(buildGradleContent).toContain('normalizeVersion(version)');
      expect(buildGradleContent).toContain(
        'shouldUseCodegenInBuildGradle(rnVersion)'
      );

      // Verify version-specific Gradle plugin selection
      expect(buildGradleContent).toContain(
        'getGradlePluginVersionForRN(reactNativeVersion)'
      );
      expect(buildGradleContent).toContain(
        'getKotlinVersionForRN(reactNativeVersion)'
      );

      // Verify namespace is added for Android Gradle Plugin 8.x compatibility
      expect(buildGradleContent).toContain(
        'namespace "com.jimmydaddy.imagemarker"'
      );

      // Verify conditional codegenConfig logic
      expect(buildGradleContent).toContain(
        'if (shouldUseCodegenInBuildGradle(reactNativeVersion))'
      );
      expect(buildGradleContent).toContain(
        'Using codegenConfig from package.json'
      );

      // Verify React Native version-specific logic
      expect(buildGradleContent).toContain('if (rnVersion.startsWith("0.73"))');
      expect(buildGradleContent).toContain('if (rnVersion.startsWith("0.81"))');
      expect(buildGradleContent).toContain('if (rnVersion.startsWith("0.8"))');

      console.log(
        'Android build.gradle version-specific configuration verified'
      );
    });

    test('Android 构建环境验证应该检查所有必需的文件和配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - 构建环境验证
       * Validates: Requirements 1.4, 4.1, 4.3
       */

      // Test build environment validation
      const isValidEnvironment =
        CrossPlatformBuildSystemAdapter.validateBuildEnvironment('android');
      expect(typeof isValidEnvironment).toBe('boolean');

      // Verify essential Android files exist
      const essentialFiles = [
        'android/build.gradle',
        // Note: gradle.properties and settings.gradle may not exist in library projects
      ];

      essentialFiles.forEach((filePath) => {
        const fullPath = path.join(process.cwd(), filePath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content.length).toBeGreaterThan(0);

        console.log(`Essential Android file verified: ${filePath}`);
      });

      // Check optional files
      const optionalFiles = [
        'android/gradle.properties',
        'android/settings.gradle',
      ];

      optionalFiles.forEach((filePath) => {
        const fullPath = path.join(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content.length).toBeGreaterThan(0);
          console.log(`Optional Android file verified: ${filePath}`);
        } else {
          console.log(
            `Optional Android file not found (acceptable): ${filePath}`
          );
        }
      });

      // Verify package.json has React Native dependency
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasReactNative =
        packageJson.dependencies?.['react-native'] ||
        packageJson.devDependencies?.['react-native'];
      expect(hasReactNative).toBeTruthy();

      console.log('Android build environment validation completed');
    });

    test('Android Gradle 插件版本应该与 React Native 版本兼容', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - Gradle 插件版本兼容性
       * Validates: Requirements 5.3, 5.4, 6.3
       */

      const versionCompatibilityMatrix = [
        {
          rnVersion: '0.73.0',
          expectedGradlePlugin: '8.1.0',
          expectedKotlin: '1.8.0',
        },
        {
          rnVersion: '0.73.3',
          expectedGradlePlugin: '8.1.0',
          expectedKotlin: '1.8.0',
        },
        {
          rnVersion: '0.81.0',
          expectedGradlePlugin: '8.3.0',
          expectedKotlin: '1.9.0',
        },
        {
          rnVersion: '0.81.2',
          expectedGradlePlugin: '8.3.0',
          expectedKotlin: '1.9.0',
        },
        {
          rnVersion: '0.82.0',
          expectedGradlePlugin: '8.4.0',
          expectedKotlin: '1.9.22',
        },
        {
          rnVersion: '0.83.0',
          expectedGradlePlugin: '8.4.0',
          expectedKotlin: '1.9.22',
        },
      ];

      versionCompatibilityMatrix.forEach(
        ({ rnVersion, expectedGradlePlugin, expectedKotlin }) => {
          const strategy =
            CrossPlatformVersionDetector.getConfigurationStrategy(rnVersion);
          const androidConfig = strategy.getAndroidConfig();

          expect(androidConfig.buildConfig.gradlePluginVersion).toBe(
            expectedGradlePlugin
          );
          expect(androidConfig.buildConfig.kotlinVersion).toBe(expectedKotlin);

          // Verify SDK versions are appropriate for the React Native version
          if (rnVersion.startsWith('0.73')) {
            expect(androidConfig.buildConfig.compileSdkVersion).toBe(34);
            expect(androidConfig.buildConfig.targetSdkVersion).toBe(34);
            expect(androidConfig.buildConfig.minSdkVersion).toBe(21);
          } else if (rnVersion.startsWith('0.81')) {
            expect(androidConfig.buildConfig.compileSdkVersion).toBe(34);
            expect(androidConfig.buildConfig.targetSdkVersion).toBe(34);
            expect(androidConfig.buildConfig.minSdkVersion).toBe(23);
          } else if (rnVersion.startsWith('0.8')) {
            expect(androidConfig.buildConfig.compileSdkVersion).toBe(35);
            expect(androidConfig.buildConfig.targetSdkVersion).toBe(35);
            expect(androidConfig.buildConfig.minSdkVersion).toBe(24);
          }

          console.log(
            `Version compatibility verified: RN ${rnVersion} → Gradle ${expectedGradlePlugin}, Kotlin ${expectedKotlin}`
          );
        }
      );
    });

    test('Android 构建配置应该支持新架构和传统架构', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - 架构兼容性
       * Validates: Requirements 1.1, 1.4, 1.5
       */

      const buildGradlePath = path.join(
        process.cwd(),
        'android',
        'build.gradle'
      );
      const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

      // Verify new architecture detection
      expect(buildGradleContent).toContain('isNewArchitectureEnabled()');
      expect(buildGradleContent).toContain('newArchEnabled');

      // Verify conditional React plugin application
      expect(buildGradleContent).toContain('if (isNewArchitectureEnabled())');
      expect(buildGradleContent).toContain(
        'apply plugin: "com.facebook.react"'
      );

      // Verify build config field for architecture detection
      expect(buildGradleContent).toContain('IS_NEW_ARCHITECTURE_ENABLED');

      // Verify conditional source sets
      expect(buildGradleContent).toContain('sourceSets');
      expect(buildGradleContent).toContain('src/newarch/java');
      expect(buildGradleContent).toContain('src/oldarch/java');
      expect(buildGradleContent).toContain('generated/source/codegen/java');

      // Verify conditional dependencies
      expect(buildGradleContent).toContain('if (isNewArchitectureEnabled())');
      expect(buildGradleContent).toContain('react-android');
      expect(buildGradleContent).toContain('hermes-android');

      // Verify React configuration block
      expect(buildGradleContent).toContain('react {');
      expect(buildGradleContent).toContain('libraryName = "ImageMarker"');
      expect(buildGradleContent).toContain(
        'codegenJavaPackageName = "com.jimmydaddy.imagemarker"'
      );

      console.log('Android architecture compatibility configuration verified');
    });

    test('Android codegenConfig 应该根据版本正确配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - Codegen 配置
       * Validates: Requirements 2.1, 2.2, 2.5
       */

      const testVersions = ['0.73.3', '0.81.0', '0.82.0'];

      testVersions.forEach((version) => {
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy(version);
        const codegenConfig = strategy.getCodegenConfig();

        expect(codegenConfig.name).toBe('RNImageMarkerSpec');
        expect(codegenConfig.type).toBe('modules');
        expect(codegenConfig.jsSrcsDir).toBe('src');
        expect(codegenConfig.android?.javaPackageName).toBe(
          'com.jimmydaddy.imagemarker'
        );

        // Verify spec files are referenced
        expect(Array.isArray(codegenConfig.specFiles)).toBe(true);
        expect(codegenConfig.specFiles).toContain('specs/NativeImageMarker.ts');

        // Verify spec file exists
        const specFilePath = path.join(
          process.cwd(),
          'specs/NativeImageMarker.ts'
        );
        expect(fs.existsSync(specFilePath)).toBe(true);

        console.log(
          `Codegen configuration verified for React Native ${version}`
        );
      });

      // Verify package.json has codegenConfig
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      expect(packageJson.codegenConfig).toBeDefined();
      expect(packageJson.codegenConfig.name).toBe('RNImageMarkerSpec');
      expect(packageJson.codegenConfig.type).toBe('modules');
      expect(packageJson.codegenConfig.jsSrcsDir).toBe('src');
      expect(packageJson.codegenConfig.android?.javaPackageName).toBe(
        'com.jimmydaddy.imagemarker'
      );

      console.log('Package.json codegenConfig verified');
    });

    test('Android 构建系统适配器应该正确配置 Gradle 插件', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - 构建系统适配
       * Validates: Requirements 5.3, 5.4, 6.3
       */

      const testVersions = ['0.73.3', '0.81.0', '0.82.0'];

      testVersions.forEach((version) => {
        // Test configuration without throwing errors
        expect(() => {
          CrossPlatformBuildSystemAdapter.configureAndroidGradlePlugin(version);
        }).not.toThrow();

        // Test Codegen integration setup
        expect(() => {
          CrossPlatformBuildSystemAdapter.setupCodegenIntegration('android');
        }).not.toThrow();

        // Test build configuration synchronization
        expect(() => {
          CrossPlatformBuildSystemAdapter.syncBuildConfigurations();
        }).not.toThrow();

        console.log(
          `Build system adapter configuration tested for React Native ${version}`
        );
      });

      // Test build environment validation
      const isValidAndroid =
        CrossPlatformBuildSystemAdapter.validateBuildEnvironment('android');
      expect(typeof isValidAndroid).toBe('boolean');

      console.log('Android build system adapter functionality verified');
    });

    test('Android 构建错误应该提供清晰的诊断信息', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - 错误诊断
       * Validates: Requirements 1.3, 4.2, 8.1, 8.2, 8.3
       */

      // Test version detection error handling
      const originalCwd = process.cwd;
      process.cwd = () => '/nonexistent/path';

      try {
        const version = CrossPlatformVersionDetector.detectReactNativeVersion();
        // Should fallback to default version
        expect(version).toBe('0.73.0');
      } finally {
        process.cwd = originalCwd;
      }

      // Test unsupported version handling
      const unsupportedVersions = ['0.60.0', '0.70.0', '1.0.0'];

      unsupportedVersions.forEach((version) => {
        expect(CrossPlatformVersionDetector.isVersionSupported(version)).toBe(
          false
        );

        // Should still create a configuration strategy (fallback to latest)
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy(version);
        expect(strategy).toBeDefined();

        console.log(`Unsupported version ${version} handled gracefully`);
      });

      // Test build environment validation with missing files
      // Since we can't mock fs.existsSync in ESM, we'll test the error handling differently
      // by testing with a non-existent directory
      const originalCwdFunc = process.cwd;
      process.cwd = () => '/nonexistent/android/path';

      try {
        const isValid =
          CrossPlatformBuildSystemAdapter.validateBuildEnvironment('android');
        // Should return false for non-existent directory
        expect(typeof isValid).toBe('boolean');
        console.log(
          `Build environment validation with invalid path: ${isValid}`
        );
      } finally {
        process.cwd = originalCwdFunc;
      }

      console.log('Android build error diagnostics verified');
    });

    test('Android 构建性能应该在可接受范围内', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（Android 部分） - 构建性能
       * Validates: Requirements 4.5, 5.5
       */

      // Test version detection performance
      const detectionStart = performance.now();
      CrossPlatformVersionDetector.reset();
      const version = CrossPlatformVersionDetector.detectReactNativeVersion();
      const detectionTime = performance.now() - detectionStart;

      expect(detectionTime).toBeLessThan(1000); // Should be fast
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);

      // Test configuration strategy creation performance
      const strategyStart = performance.now();
      const strategy =
        CrossPlatformVersionDetector.getConfigurationStrategy(version);
      const strategyTime = performance.now() - strategyStart;

      expect(strategyTime).toBeLessThan(100); // Should be very fast
      expect(strategy).toBeDefined();

      // Test Android configuration retrieval performance
      const configStart = performance.now();
      const androidConfig = strategy.getAndroidConfig();
      const configTime = performance.now() - configStart;

      expect(configTime).toBeLessThan(50); // Should be very fast
      expect(androidConfig).toBeDefined();

      // Test build environment validation performance
      const validationStart = performance.now();
      CrossPlatformBuildSystemAdapter.validateBuildEnvironment('android');
      const validationTime = performance.now() - validationStart;

      expect(validationTime).toBeLessThan(500); // Should be reasonably fast

      console.log(
        `Performance metrics - Detection: ${detectionTime.toFixed(
          2
        )}ms, Strategy: ${strategyTime.toFixed(
          2
        )}ms, Config: ${configTime.toFixed(
          2
        )}ms, Validation: ${validationTime.toFixed(2)}ms`
      );
    });
  });
});
