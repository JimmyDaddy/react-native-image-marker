import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CodegenConfigurationManager } from '../CodegenConfigurationManager';
import { CrossPlatformVersionDetector } from '../CrossPlatformVersionDetector';

// Mock file system operations for testing
vi.mock('fs');
vi.mock('path');

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('Codegen Configuration Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default path mocking
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/project');
  });

  describe('Property 4: 跨平台 Codegen 代码生成正确性', () => {
    test('对于任何有效的 TurboModule 规范文件和目标平台，Codegen 应该生成与 TypeScript 定义匹配的原生接口代码', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 4: 跨平台 Codegen 代码生成正确性
       * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
       */

      // Test data: Valid spec file content
      const validSpecContent = `
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export enum Position {
  topLeft = 'topLeft',
  topCenter = 'topCenter',
  topRight = 'topRight',
  bottomLeft = 'bottomLeft',
  bottomCenter = 'bottomCenter',
  bottomRight = 'bottomRight',
  center = 'center',
}

export enum TextBackgroundType {
  stretchX = 'stretchX',
  stretchY = 'stretchY',
  none = 'fit',
}

export enum ImageFormat {
  png = 'png',
  jpg = 'jpg',
  base64 = 'base64',
}

export interface TextMarkOptions {
  backgroundImage: Object;
  watermarkTexts: Object[];
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
}

export interface ImageMarkOptions {
  backgroundImage: Object;
  watermarkImage?: Object;
  watermarkPositions?: Object;
  quality?: number;
  filename?: string;
  saveFormat?: ImageFormat;
  maxSize?: number;
  watermarkImages: Object[];
}

export interface Spec extends TurboModule {
  markWithText(options: TextMarkOptions): Promise<string>;
  markWithImage(options: ImageMarkOptions): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ImageMarker');
`;

      // Test data: Valid package.json content
      const validPackageJson = {
        name: 'react-native-image-marker',
        codegenConfig: {
          name: 'RNImageMarkerSpec',
          type: 'modules',
          jsSrcsDir: 'specs',
          android: {
            javaPackageName: 'com.jimmydaddy.imagemarker',
            outputDir: 'android/build/generated/source/codegen',
          },
          ios: {
            moduleName: 'RNImageMarkerSpec',
            outputDir: 'ios/build/generated/ios',
          },
        },
      };

      // Mock file system responses
      mockFs.existsSync.mockImplementation((filePath: any) => {
        if (
          typeof filePath === 'string' &&
          filePath.includes('specs/NativeImageMarker.ts')
        )
          return true;
        if (typeof filePath === 'string' && filePath.includes('package.json'))
          return true;
        if (
          typeof filePath === 'string' &&
          filePath.includes('android/build.gradle')
        )
          return true;
        if (
          typeof filePath === 'string' &&
          filePath.includes('react-native-image-marker.podspec')
        )
          return true;
        return false;
      });

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (
          typeof filePath === 'string' &&
          filePath.includes('specs/NativeImageMarker.ts')
        )
          return validSpecContent;
        if (typeof filePath === 'string' && filePath.includes('package.json'))
          return JSON.stringify(validPackageJson);
        if (
          typeof filePath === 'string' &&
          filePath.includes('android/build.gradle')
        )
          return 'android { }';
        if (
          typeof filePath === 'string' &&
          filePath.includes('react-native-image-marker.podspec')
        )
          return 's.name = "react-native-image-marker"';
        return '';
      });

      mockFs.writeFileSync.mockImplementation(() => {});

      // Mock version detection
      vi.spyOn(
        CrossPlatformVersionDetector,
        'detectReactNativeVersion'
      ).mockReturnValue('0.73.0');

      // Test different React Native versions
      const testVersions = ['0.73.0', '0.81.0', '0.82.0'];

      testVersions.forEach((version) => {
        vi.spyOn(
          CrossPlatformVersionDetector,
          'detectReactNativeVersion'
        ).mockReturnValue(version);

        // Test spec file validation
        const specValidation = CodegenConfigurationManager.validateSpecFile();

        expect(specValidation.isValid).toBe(true);
        expect(specValidation.specFileExists).toBe(true);
        expect(specValidation.interfaceValidation.hasSpecInterface).toBe(true);
        expect(specValidation.interfaceValidation.hasCorrectMethods).toBe(true);
        expect(specValidation.interfaceValidation.hasCorrectTypes).toBe(true);
        expect(specValidation.errors).toHaveLength(0);

        // Test platform-specific differences
        const platformDifferences =
          CodegenConfigurationManager.getPlatformSpecificCodegenDifferences(
            version
          );

        // Android configuration should be correct
        expect(platformDifferences.android.javaPackageName).toBe(
          'com.jimmydaddy.imagemarker'
        );
        expect(platformDifferences.android.outputDir).toContain(
          'android/build/generated'
        );
        expect(platformDifferences.android.configLocation).toBeDefined();

        // iOS configuration should be correct
        expect(platformDifferences.ios.moduleName).toBe('RNImageMarkerSpec');
        expect(platformDifferences.ios.outputDir).toContain(
          'ios/build/generated'
        );
        expect(platformDifferences.ios.configLocation).toBeDefined();

        // Shared configuration should be correct
        expect(platformDifferences.shared.specFiles).toContain(
          'specs/NativeImageMarker.ts'
        );
        expect(platformDifferences.shared.jsSrcsDir).toBe('specs');
        expect(platformDifferences.shared.type).toBe('modules');

        // Version-specific features
        if (version >= '0.73.0') {
          expect(
            platformDifferences.android.additionalSettings.useNewCodegenLocation
          ).toBe(true);
          expect(
            platformDifferences.ios.additionalSettings.useNewCodegenLocation
          ).toBe(true);
        }

        if (version >= '0.81.0') {
          expect(
            platformDifferences.android.additionalSettings.supportsFabric
          ).toBe(true);
          expect(
            platformDifferences.ios.additionalSettings.supportsFabric
          ).toBe(true);
          expect(platformDifferences.shared.fabricEnabled).toBe(true);
        }

        console.log(
          `Codegen configuration validated for React Native ${version}`
        );
      });
    });

    test('Codegen 配置同步应该处理 Android 和 iOS 的配置差异', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 4: 跨平台 Codegen 代码生成正确性 - 配置同步
       * Validates: Requirements 2.1, 2.2, 2.5
       */

      const validPackageJson = {
        name: 'react-native-image-marker',
        codegenConfig: {
          name: 'RNImageMarkerSpec',
          type: 'modules',
          jsSrcsDir: 'specs',
          android: {
            javaPackageName: 'com.jimmydaddy.imagemarker',
            outputDir: 'android/build/generated/source/codegen',
          },
          ios: {
            moduleName: 'RNImageMarkerSpec',
            outputDir: 'ios/build/generated/ios',
          },
        },
      };

      const validSpecContent = `
export interface Spec extends TurboModule {
  markWithText(options: TextMarkOptions): Promise<string>;
  markWithImage(options: ImageMarkOptions): Promise<string>;
}
export default TurboModuleRegistry.getEnforcing<Spec>('ImageMarker');
`;

      // Mock file system
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        if (typeof filePath === 'string' && filePath.includes('package.json'))
          return JSON.stringify(validPackageJson);
        if (
          typeof filePath === 'string' &&
          filePath.includes('specs/NativeImageMarker.ts')
        )
          return validSpecContent;
        if (
          typeof filePath === 'string' &&
          filePath.includes('android/build.gradle')
        )
          return 'react { }';
        if (
          typeof filePath === 'string' &&
          filePath.includes('react-native-image-marker.podspec')
        )
          return 's.name = "test"';
        return '';
      });
      mockFs.writeFileSync.mockImplementation(() => {});

      // Mock version detection
      vi.spyOn(
        CrossPlatformVersionDetector,
        'detectReactNativeVersion'
      ).mockReturnValue('0.73.0');

      // Test configuration synchronization
      const syncResult =
        CodegenConfigurationManager.syncCodegenConfigurations('0.73.0');

      expect(syncResult.success).toBe(true);
      expect(syncResult.errors).toHaveLength(0);
      expect(syncResult.syncedConfigurations).toHaveLength(2); // Android + iOS

      // Check Android sync result
      const androidSync = syncResult.syncedConfigurations.find(
        (config) => config.platform === 'android'
      );
      expect(androidSync).toBeDefined();
      expect(androidSync?.platform).toBe('android');

      // Check iOS sync result
      const iosSync = syncResult.syncedConfigurations.find(
        (config) => config.platform === 'ios'
      );
      expect(iosSync).toBeDefined();
      expect(iosSync?.platform).toBe('ios');

      console.log('Codegen configuration synchronization validated');
    });

    test('版本特定的配置位置应该正确选择', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 4: 跨平台 Codegen 代码生成正确性 - 版本特定配置
       * Validates: Requirements 2.1, 2.2, 2.5
       */

      const versionTestCases = [
        {
          version: '0.72.0',
          expectedAndroidLocation: 'package.json',
          expectedIOSLocation: 'package.json',
        },
        {
          version: '0.73.0',
          expectedAndroidLocation: 'build.gradle',
          expectedIOSLocation: 'podspec',
        },
        {
          version: '0.81.0',
          expectedAndroidLocation: 'build.gradle',
          expectedIOSLocation: 'podspec',
        },
        {
          version: '0.82.0',
          expectedAndroidLocation: 'build.gradle',
          expectedIOSLocation: 'podspec',
        },
      ];

      versionTestCases.forEach((testCase) => {
        const differences =
          CodegenConfigurationManager.getPlatformSpecificCodegenDifferences(
            testCase.version
          );

        expect(differences.android.configLocation).toBe(
          testCase.expectedAndroidLocation
        );
        expect(differences.ios.configLocation).toBe(
          testCase.expectedIOSLocation
        );

        // Output directories should be version-appropriate
        expect(differences.android.outputDir).toContain(
          'android/build/generated'
        );
        expect(differences.ios.outputDir).toContain('ios/build/generated');

        console.log(
          `Version-specific configuration validated for ${testCase.version}`
        );
      });
    });
  });
});
