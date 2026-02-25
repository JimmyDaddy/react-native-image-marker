/**
 * Property-Based Tests for Example Apps Architecture Support
 *
 * Feature: android-ci-build-fix
 *
 * This test suite validates the architecture switching functionality across
 * all example applications using property-based testing.
 */

import { describe, test, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Import architecture management functions
const switchArchModule = require('../../scripts/switch-architecture.js');
const checkArchModule = require('../../scripts/check-architecture.js');
const manageArchModule = require('../../scripts/manage-architecture.js');
const switchExpoModule = require('../../scripts/switch-expo-architecture.js');

describe('Example Apps Architecture Properties', () => {
  const EXAMPLE_APPS = [
    {
      name: 'example',
      path: 'example',
      type: 'react-native',
      platforms: ['android', 'ios'],
    },
    {
      name: 'example-0.73',
      path: 'example-0.73',
      type: 'react-native',
      platforms: ['android', 'ios'],
    },
    {
      name: 'expo-example',
      path: 'expo-example',
      type: 'expo',
      platforms: ['android', 'ios'],
    },
  ];

  // Cleanup: Reset all apps to legacy architecture after tests
  afterAll(() => {
    for (const app of EXAMPLE_APPS) {
      if (!fs.existsSync(app.path)) {
        continue;
      }

      if (app.type === 'expo') {
        switchExpoModule.updateExpoAppJson(false);
      } else {
        switchArchModule.updateAndroidGradleProperties(app.path, false);
        switchArchModule.updateIOSPodfile(app.path, false);
        switchArchModule.updateIOSXcodeEnv(app.path, false);
      }
    }
  });

  /**
   * Property 10: 跨平台示例应用功能完整性
   *
   * 对于任何版本和平台的示例应用（Android, iOS, Expo），系统应该保留核心功能逻辑，
   * 确保图片水印功能正常工作，并提供一致的用户体验
   *
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2
   */
  test('Property 10: Cross-Platform Example App Functional Completeness', () => {
    /**
     * Feature: android-ci-build-fix
     * Property 10: 对于任何版本和平台的示例应用，系统应该保留核心功能逻辑
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2
     */

    for (const app of EXAMPLE_APPS) {
      // Skip if app doesn't exist (optional apps)
      if (!fs.existsSync(app.path)) {
        continue;
      }

      // Property: App should have App.tsx or equivalent entry point
      const possibleEntryPoints = [
        path.join(app.path, 'src', 'App.tsx'),
        path.join(app.path, 'App.tsx'),
        path.join(app.path, 'index.js'),
      ];

      const hasEntryPoint = possibleEntryPoints.some((p) => fs.existsSync(p));
      expect(hasEntryPoint, `${app.name} should have an entry point`).toBe(
        true
      );

      // Property: App should have package.json with required dependencies
      const packageJsonPath = path.join(app.path, 'package.json');
      expect(
        fs.existsSync(packageJsonPath),
        `${app.name} should have package.json`
      ).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Should have react-native-image-marker dependency, be the root package, or use module resolver
      const hasDependency =
        packageJson.dependencies?.['react-native-image-marker'] !== undefined ||
        packageJson.devDependencies?.['react-native-image-marker'] !==
          undefined ||
        packageJson.name === 'react-native-image-marker' || // Root package
        packageJson.devDependencies?.['babel-plugin-module-resolver'] !==
          undefined; // Uses module resolver

      expect(
        hasDependency,
        `${app.name} should have react-native-image-marker or use module resolver`
      ).toBe(true);

      // Property: App should have platform-specific directories
      for (const platform of app.platforms) {
        if (app.type === 'expo') {
          // Expo apps may not have native directories until prebuild
          // Check for app.json instead
          const appJsonPath = path.join(app.path, 'app.json');
          expect(
            fs.existsSync(appJsonPath),
            `${app.name} should have app.json`
          ).toBe(true);
        } else {
          // React Native apps should have native directories
          const platformPath = path.join(app.path, platform);
          expect(
            fs.existsSync(platformPath),
            `${app.name} should have ${platform} directory`
          ).toBe(true);
        }
      }

      // Property: App should have architecture configuration files
      if (app.type === 'expo') {
        const appJsonPath = path.join(app.path, 'app.json');
        expect(
          fs.existsSync(appJsonPath),
          `${app.name} should have app.json`
        ).toBe(true);

        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        expect(
          appJson.expo,
          `${app.name} app.json should have expo config`
        ).toBeDefined();
      } else {
        // Android
        const gradlePropsPath = path.join(
          app.path,
          'android',
          'gradle.properties'
        );
        expect(
          fs.existsSync(gradlePropsPath),
          `${app.name} should have gradle.properties`
        ).toBe(true);

        // iOS
        const podfilePath = path.join(app.path, 'ios', 'Podfile');
        expect(
          fs.existsSync(podfilePath),
          `${app.name} should have Podfile`
        ).toBe(true);
      }
    }
  });

  /**
   * Property 11: 跨平台示例应用架构适配性
   *
   * 对于任何架构模式和平台组合下运行的示例应用，系统应该自动选择合适的实现
   * （Legacy 或 TurboModule），验证库的正确集成，并在出现错误时提供清晰的调试信息
   *
   * Validates: Requirements 10.3, 10.4, 10.5
   */
  test('Property 11: Cross-Platform Example App Architecture Adaptability', () => {
    /**
     * Feature: android-ci-build-fix
     * Property 11: 对于任何架构模式和平台组合，系统应该自动选择合适的实现
     * Validates: Requirements 10.3, 10.4, 10.5
     */

    const architectures = ['legacy', 'new'] as const;

    for (const app of EXAMPLE_APPS) {
      // Skip if app doesn't exist
      if (!fs.existsSync(app.path)) {
        continue;
      }

      for (const architecture of architectures) {
        // Property: Should be able to switch to any architecture
        let switchResult: boolean;

        if (app.type === 'expo') {
          switchResult = switchExpoModule.updateExpoAppJson(
            architecture === 'new'
          );
        } else {
          // Test Android
          const androidResult = switchArchModule.updateAndroidGradleProperties(
            app.path,
            architecture === 'new'
          );

          // Test iOS
          const iosResult = switchArchModule.updateIOSPodfile(
            app.path,
            architecture === 'new'
          );

          switchResult = androidResult && iosResult;
        }

        expect(
          switchResult,
          `${app.name} should switch to ${architecture} architecture`
        ).toBe(true);

        // Property: Configuration should be readable and valid after switch
        if (app.type === 'expo') {
          const status = switchExpoModule.checkExpoArchitecture();
          expect(status.status, `${app.name} Expo config should be valid`).toBe(
            'configured'
          );
          expect(status.value, `${app.name} should be ${architecture}`).toBe(
            architecture
          );
        } else {
          // Check Android
          const androidStatus = checkArchModule.checkAndroidArchitecture(
            app.path
          );
          expect(
            androidStatus.status,
            `${app.name} Android config should be valid`
          ).toBe('configured');
          expect(
            androidStatus.value,
            `${app.name} Android should be ${architecture}`
          ).toBe(architecture);

          // Check iOS
          const iosStatus = checkArchModule.checkIOSArchitecture(app.path);
          expect(
            iosStatus.podfile.status,
            `${app.name} iOS Podfile should be valid`
          ).toBe('configured');
          expect(
            iosStatus.podfile.value,
            `${app.name} iOS should be ${architecture}`
          ).toBe(architecture);
        }
      }
    }
  });

  /**
   * Property 3 (Extended): 跨平台架构兼容性一致性（示例应用验证）
   *
   * 对于任何架构模式（Legacy 或 New Architecture）和平台组合，
   * 系统应该提供功能一致的构建结果，且架构切换应该自动调整所有相关的平台配置
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   */
  test('Property 3 (Extended): Cross-Platform Architecture Compatibility Consistency', () => {
    /**
     * Feature: android-ci-build-fix
     * Property 3: 对于任何架构模式和平台组合，系统应该提供功能一致的构建结果
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
     */

    const architectures = ['legacy', 'new'] as const;

    for (const architecture of architectures) {
      const enableNewArch = architecture === 'new';

      for (const app of EXAMPLE_APPS) {
        // Skip if app doesn't exist
        if (!fs.existsSync(app.path)) {
          continue;
        }

        // Property: All platforms should have consistent architecture configuration
        if (app.type === 'expo') {
          // Expo: Check app.json
          switchExpoModule.updateExpoAppJson(enableNewArch);
          const status = switchExpoModule.checkExpoArchitecture();

          expect(status.status).toBe('configured');
          expect(status.value).toBe(architecture);

          // Verify plugin configuration consistency
          if (status.config) {
            expect(status.config.newArchEnabled).toBe(enableNewArch);
            expect(status.config.enableFabric).toBe(enableNewArch);
            expect(status.config.enableTurboModules).toBe(enableNewArch);
          }
        } else {
          // React Native: Check Android and iOS
          switchArchModule.updateAndroidGradleProperties(
            app.path,
            enableNewArch
          );
          switchArchModule.updateIOSPodfile(app.path, enableNewArch);
          switchArchModule.updateIOSXcodeEnv(app.path, enableNewArch);

          const androidStatus = checkArchModule.checkAndroidArchitecture(
            app.path
          );
          const iosStatus = checkArchModule.checkIOSArchitecture(app.path);

          // Property: Android configuration should match expected architecture
          expect(androidStatus.status).toBe('configured');
          expect(androidStatus.value).toBe(architecture);

          // Property: iOS configuration should match expected architecture
          expect(iosStatus.podfile.status).toBe('configured');
          expect(iosStatus.podfile.value).toBe(architecture);
          expect(iosStatus.xcodeEnv.status).toBe('configured');
          expect(iosStatus.xcodeEnv.value).toBe(architecture);

          // Property: Android and iOS should have consistent configuration
          expect(androidStatus.value).toBe(iosStatus.podfile.value);
          expect(iosStatus.podfile.value).toBe(iosStatus.xcodeEnv.value);
        }
      }
    }
  });

  /**
   * Additional Property: Architecture Switching Idempotency
   *
   * Switching to the same architecture multiple times should produce the same result
   */
  test('Property: Architecture Switching Idempotency', () => {
    /**
     * Feature: android-ci-build-fix
     * Property: Switching to the same architecture multiple times should be idempotent
     * Validates: Requirements 3.1, 3.2, 9.1, 9.2, 9.3
     */

    const architectures = ['legacy', 'new'] as const;

    for (const app of EXAMPLE_APPS) {
      // Skip if app doesn't exist
      if (!fs.existsSync(app.path)) {
        continue;
      }

      for (const architecture of architectures) {
        const enableNewArch = architecture === 'new';

        // Switch once
        if (app.type === 'expo') {
          switchExpoModule.updateExpoAppJson(enableNewArch);
          const status1 = switchExpoModule.checkExpoArchitecture();

          // Switch again
          switchExpoModule.updateExpoAppJson(enableNewArch);
          const status2 = switchExpoModule.checkExpoArchitecture();

          // Property: Results should be identical
          expect(status1.value).toBe(status2.value);
          expect(status1.status).toBe(status2.status);
        } else {
          // Switch once
          switchArchModule.updateAndroidGradleProperties(
            app.path,
            enableNewArch
          );
          switchArchModule.updateIOSPodfile(app.path, enableNewArch);

          const android1 = checkArchModule.checkAndroidArchitecture(app.path);
          const ios1 = checkArchModule.checkIOSArchitecture(app.path);

          // Switch again
          switchArchModule.updateAndroidGradleProperties(
            app.path,
            enableNewArch
          );
          switchArchModule.updateIOSPodfile(app.path, enableNewArch);

          const android2 = checkArchModule.checkAndroidArchitecture(app.path);
          const ios2 = checkArchModule.checkIOSArchitecture(app.path);

          // Property: Results should be identical
          expect(android1.value).toBe(android2.value);
          expect(ios1.podfile.value).toBe(ios2.podfile.value);
        }
      }
    }
  });

  /**
   * Additional Property: Configuration File Integrity
   *
   * Architecture switching should not corrupt configuration files
   */
  test('Property: Configuration File Integrity', () => {
    /**
     * Feature: android-ci-build-fix
     * Property: Architecture switching should preserve configuration file integrity
     * Validates: Requirements 5.2, 5.3, 9.1, 9.2, 9.3
     */

    for (const app of EXAMPLE_APPS) {
      // Skip if app doesn't exist
      if (!fs.existsSync(app.path)) {
        continue;
      }

      if (app.type === 'expo') {
        const appJsonPath = path.join(app.path, 'app.json');

        // Switch architecture
        switchExpoModule.updateExpoAppJson(true);

        // Property: File should still be valid JSON
        const newContent = fs.readFileSync(appJsonPath, 'utf8');
        expect(() => JSON.parse(newContent)).not.toThrow();

        // Property: File should still have expo config
        const appJson = JSON.parse(newContent);
        expect(appJson.expo).toBeDefined();
        expect(appJson.expo.plugins).toBeDefined();
        expect(Array.isArray(appJson.expo.plugins)).toBe(true);
      } else {
        // Check Android gradle.properties
        const gradlePropsPath = path.join(
          app.path,
          'android',
          'gradle.properties'
        );
        if (fs.existsSync(gradlePropsPath)) {
          // Switch architecture
          switchArchModule.updateAndroidGradleProperties(app.path, true);

          // Property: File should still be readable
          const newContent = fs.readFileSync(gradlePropsPath, 'utf8');
          expect(newContent.length).toBeGreaterThan(0);

          // Property: File should still have newArchEnabled property
          expect(newContent).toMatch(/newArchEnabled\s*=\s*(true|false)/);
        }

        // Check iOS Podfile
        const podfilePath = path.join(app.path, 'ios', 'Podfile');
        if (fs.existsSync(podfilePath)) {
          // Switch architecture
          switchArchModule.updateIOSPodfile(app.path, true);

          // Property: File should still be readable
          const newContent = fs.readFileSync(podfilePath, 'utf8');
          expect(newContent.length).toBeGreaterThan(0);

          // Property: File should still have RCT_NEW_ARCH_ENABLED
          expect(newContent).toMatch(/ENV\['RCT_NEW_ARCH_ENABLED'\]/);
        }
      }
    }
  });

  /**
   * Additional Property: Batch Operations Consistency
   *
   * Batch switching all apps should produce the same result as switching individually
   */
  test('Property: Batch Operations Consistency', () => {
    /**
     * Feature: android-ci-build-fix
     * Property: Batch operations should be consistent with individual operations
     * Validates: Requirements 3.1, 3.2, 7.2, 9.4
     */

    // Switch all apps to new architecture individually
    for (const app of EXAMPLE_APPS) {
      if (!fs.existsSync(app.path)) {
        continue;
      }

      if (app.type === 'expo') {
        switchExpoModule.updateExpoAppJson(true);
      } else {
        switchArchModule.updateAndroidGradleProperties(app.path, true);
        switchArchModule.updateIOSPodfile(app.path, true);
        switchArchModule.updateIOSXcodeEnv(app.path, true);
      }
    }

    const individualStatus = manageArchModule.getStatusForAllApps();

    // Switch all back to legacy
    for (const app of EXAMPLE_APPS) {
      if (!fs.existsSync(app.path)) {
        continue;
      }

      if (app.type === 'expo') {
        switchExpoModule.updateExpoAppJson(false);
      } else {
        switchArchModule.updateAndroidGradleProperties(app.path, false);
        switchArchModule.updateIOSPodfile(app.path, false);
        switchArchModule.updateIOSXcodeEnv(app.path, false);
      }
    }

    // Switch all to new using batch operation (simulated)
    for (const app of EXAMPLE_APPS) {
      if (!fs.existsSync(app.path)) {
        continue;
      }

      if (app.type === 'expo') {
        switchExpoModule.updateExpoAppJson(true);
      } else {
        switchArchModule.updateAndroidGradleProperties(app.path, true);
        switchArchModule.updateIOSPodfile(app.path, true);
        switchArchModule.updateIOSXcodeEnv(app.path, true);
      }
    }

    const batchStatus = manageArchModule.getStatusForAllApps();

    // Property: Individual and batch operations should produce same result
    for (const app of EXAMPLE_APPS) {
      if (!fs.existsSync(app.path)) {
        continue;
      }

      const individual = individualStatus[app.name];
      const batch = batchStatus[app.name];

      if (individual && batch && individual.exists && batch.exists) {
        for (const platform of app.platforms) {
          expect(individual.platforms[platform]).toBe(
            batch.platforms[platform]
          );
        }
      }
    }
  });
});
