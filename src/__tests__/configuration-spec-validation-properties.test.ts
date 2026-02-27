import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationSpecValidator } from '../ConfigurationSpecValidator';
import { CrossPlatformVersionDetector } from '../CrossPlatformVersionDetector';

// Mock file system operations for testing
vi.mock('fs');
vi.mock('path');

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('Configuration Specification Validation Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default path mocking
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/project');
  });

  describe('Property 8: 跨平台配置规范遵循性', () => {
    test('对于任何 Codegen 参数和构建选项的配置（Android 和 iOS），系统应该遵循官方文档的配置规范并使用稳定且经过验证的配置值', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 8: 跨平台配置规范遵循性
       * Validates: Requirements 5.2, 5.3, 5.4, 5.5
       */

      // Test data: Valid configurations for different React Native versions
      const testVersions = ['0.73.0', '0.73.6', '0.81.0', '0.82.0'];

      for (const version of testVersions) {
        // Mock version detection
        vi.spyOn(
          CrossPlatformVersionDetector,
          'detectReactNativeVersion'
        ).mockReturnValue(version);

        // Test Case 1: Valid configuration following official specifications
        const validPackageJson = {
          name: 'react-native-image-marker',
          version: '1.2.10',
          codegenConfig: {
            name: 'RNImageMarkerSpec',
            type: 'modules',
            jsSrcsDir: 'src',
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

        const validBuildGradle = `
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

buildscript {
    ext {
        buildToolsVersion = "33.0.0"
        minSdkVersion = 21
        compileSdkVersion = 33
        targetSdkVersion = 33
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.1'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.0'
    }
}

android {
    namespace "com.jimmydaddy.imagemarker"
    compileSdkVersion 33
    
    defaultConfig {
        minSdkVersion 21
        targetSdkVersion 33
    }
}

react {
    codegenConfig {
        name = "RNImageMarkerSpec"
        type = "modules"
        jsSrcsDir = "specs"
        android {
            javaPackageName = "com.jimmydaddy.imagemarker"
            outputDir = "android/build/generated/source/codegen"
        }
    }
}
`;

        const validPodspec = `
require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-image-marker"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/JimmyDaddy/react-native-image-marker.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.swift_version = "5.0"

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    s.compiler_flags = "-DRCT_NEW_ARCH_ENABLED=1"
    s.pod_target_xcconfig = {
      "HEADER_SEARCH_PATHS" => "\\"$(PODS_ROOT)/boost\\" \\"$(PODS_ROOT)/RCT-Folly\\"",
      "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
  end

  install_modules_dependencies(s)
end
`;

        const validGradleProperties = `
newArchEnabled=false
android.useAndroidX=true
android.enableJetifier=true
`;

        // Mock file system
        mockFs.existsSync.mockImplementation((filePath: any) => {
          const pathStr = String(filePath);
          return (
            pathStr.includes('package.json') ||
            pathStr.includes('build.gradle') ||
            pathStr.includes('podspec') ||
            pathStr.includes('gradle.properties') ||
            pathStr.includes('src')
          );
        });

        mockFs.readFileSync.mockImplementation((filePath: any) => {
          const pathStr = String(filePath);
          if (pathStr.includes('package.json')) {
            return JSON.stringify(validPackageJson);
          } else if (pathStr.includes('build.gradle')) {
            return validBuildGradle;
          } else if (pathStr.includes('podspec')) {
            return validPodspec;
          } else if (pathStr.includes('gradle.properties')) {
            return validGradleProperties;
          }
          return '';
        });

        // Execute validation
        const result =
          ConfigurationSpecValidator.validateConfigurationSpec(version);

        // Property Assertion 1: Valid configurations should pass validation
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);

        // Property Assertion 2: Codegen parameters should conform to official specifications
        expect(result.validationDetails.codegenParameters).not.toBeNull();
        expect(result.validationDetails.codegenParameters?.isValid).toBe(true);
        expect(
          result.validationDetails.codegenParameters?.parameters.name
        ).toBe('RNImageMarkerSpec');
        expect(
          result.validationDetails.codegenParameters?.parameters.type
        ).toBe('modules');

        // Property Assertion 3: Build options should use stable and verified configuration values
        expect(result.validationDetails.buildOptions).not.toBeNull();
        expect(result.validationDetails.buildOptions?.isValid).toBe(true);

        // Property Assertion 4: Configuration should be stable
        expect(result.validationDetails.stabilityCheck).not.toBeNull();
        expect(
          result.validationDetails.stabilityCheck?.stabilityScore
        ).toBeGreaterThan(70);

        // Property Assertion 5: Configuration should be compatible across platforms
        expect(result.validationDetails.compatibilityCheck).not.toBeNull();
        expect(result.validationDetails.compatibilityCheck?.isCompatible).toBe(
          true
        );
        expect(
          result.validationDetails.compatibilityCheck?.compatibilityMatrix
            .android
        ).toBe(true);
        expect(
          result.validationDetails.compatibilityCheck?.compatibilityMatrix.ios
        ).toBe(true);
        expect(
          result.validationDetails.compatibilityCheck?.compatibilityMatrix
            .crossPlatform
        ).toBe(true);
      }
    });

    test('对于任何无效或不符合规范的配置，系统应该提供清晰的错误信息和修复建议', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 8: 跨平台配置规范遵循性 - 错误检测和建议
       * Validates: Requirements 5.2, 5.3, 5.4, 5.5
       */

      const version = '0.73.6';
      vi.spyOn(
        CrossPlatformVersionDetector,
        'detectReactNativeVersion'
      ).mockReturnValue(version);

      // Test Case 1: Invalid Codegen configuration - missing required fields
      const invalidPackageJson = {
        name: 'react-native-image-marker',
        codegenConfig: {
          // Missing 'name' field
          type: 'modules',
          // Missing 'jsSrcsDir' field
          android: {
            // Missing 'javaPackageName'
            outputDir: 'android/build/generated/source/codegen',
          },
          ios: {
            // Missing 'moduleName'
            outputDir: 'ios/build/generated/ios',
          },
        },
      };

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        return (
          pathStr.includes('package.json') ||
          pathStr.includes('build.gradle') ||
          pathStr.includes('podspec') ||
          pathStr.includes('gradle.properties')
        );
      });

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr.includes('package.json')) {
          return JSON.stringify(invalidPackageJson);
        } else if (pathStr.includes('build.gradle')) {
          return `
apply plugin: 'com.android.library'
android {
    compileSdkVersion 33
}
`;
        } else if (pathStr.includes('podspec')) {
          return `
Pod::Spec.new do |s|
  s.name = "react-native-image-marker"
  s.platform = :ios, "13.0"
end
`;
        } else if (pathStr.includes('gradle.properties')) {
          return 'android.useAndroidX=true';
        }
        return '';
      });

      const result =
        ConfigurationSpecValidator.validateConfigurationSpec(version);

      // Property Assertion 1: Invalid configurations should fail validation
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Property Assertion 2: System should provide clear error messages
      const hasCodegenErrors = result.errors.some(
        (error) =>
          error.includes('name') ||
          error.includes('jsSrcsDir') ||
          error.includes('javaPackageName') ||
          error.includes('moduleName')
      );
      expect(hasCodegenErrors).toBe(true);

      // Property Assertion 3: System should provide recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Property Assertion 4: Recommendations should be actionable
      const hasActionableRecommendations = result.recommendations.some(
        (rec) =>
          rec.includes('Add') ||
          rec.includes('Update') ||
          rec.includes('Consider') ||
          rec.includes('Specify')
      );
      expect(hasActionableRecommendations).toBe(true);
    });

    test('对于任何版本特定的配置要求，系统应该根据 React Native 版本提供正确的验证和建议', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 8: 跨平台配置规范遵循性 - 版本特定验证
       * Validates: Requirements 5.1, 5.2, 5.3
       */

      const testCases = [
        {
          version: '0.73.0',
          expectedGradlePlugin: '8.1.1',
          expectedKotlin: '1.8.0',
          expectedCompileSdk: 33,
          expectedIOSTarget: '13.0',
        },
        {
          version: '0.81.0',
          expectedGradlePlugin: '8.3.0',
          expectedKotlin: '1.9.0',
          expectedCompileSdk: 34,
          expectedIOSTarget: '13.4',
        },
      ];

      for (const testCase of testCases) {
        vi.spyOn(
          CrossPlatformVersionDetector,
          'detectReactNativeVersion'
        ).mockReturnValue(testCase.version);

        // Configuration with outdated versions
        const packageJson = {
          name: 'react-native-image-marker',
          codegenConfig: {
            name: 'RNImageMarkerSpec',
            type: 'modules',
            jsSrcsDir: 'src',
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

        const buildGradle = `
apply plugin: 'com.android.library'
buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.7.0'
    }
}
android {
    namespace "com.jimmydaddy.imagemarker"
    compileSdkVersion 31
}
`;

        const podspec = `
Pod::Spec.new do |s|
  s.name = "react-native-image-marker"
  s.platform = :ios, "12.4"
  s.swift_version = "5.0"
end
`;

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockImplementation((filePath: any) => {
          const pathStr = String(filePath);
          if (pathStr.includes('package.json')) {
            return JSON.stringify(packageJson);
          } else if (pathStr.includes('build.gradle')) {
            return buildGradle;
          } else if (pathStr.includes('podspec')) {
            return podspec;
          } else if (pathStr.includes('gradle.properties')) {
            return 'newArchEnabled=false';
          }
          return '';
        });

        const result = ConfigurationSpecValidator.validateConfigurationSpec(
          testCase.version
        );

        // Property Assertion 1: System should detect version-specific issues
        expect(result.warnings.length).toBeGreaterThan(0);

        // Property Assertion 2: System should recommend version-appropriate configurations
        const hasVersionSpecificRecommendations = result.recommendations.some(
          (rec) =>
            rec.includes(testCase.expectedGradlePlugin) ||
            rec.includes(testCase.expectedKotlin) ||
            rec.includes(String(testCase.expectedCompileSdk)) ||
            rec.includes(testCase.expectedIOSTarget)
        );
        expect(hasVersionSpecificRecommendations).toBe(true);

        // Property Assertion 3: Build options validation should include version-specific checks
        expect(result.validationDetails.buildOptions).not.toBeNull();
        expect(result.validationDetails.buildOptions?.android).not.toBeNull();
        expect(result.validationDetails.buildOptions?.ios).not.toBeNull();
      }
    });

    test('对于任何跨平台配置不一致的情况，系统应该检测并提供统一建议', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 8: 跨平台配置规范遵循性 - 跨平台一致性
       * Validates: Requirements 5.2, 5.4, 5.5
       */

      const version = '0.73.6';
      vi.spyOn(
        CrossPlatformVersionDetector,
        'detectReactNativeVersion'
      ).mockReturnValue(version);

      // Test Case: Inconsistent cross-platform configuration
      const inconsistentPackageJson = {
        name: 'react-native-image-marker',
        codegenConfig: {
          name: 'RNImageMarkerSpec',
          type: 'modules',
          jsSrcsDir: 'src',
          android: {
            javaPackageName: 'com.example.different',
            outputDir: 'android/build/codegen', // Different pattern
          },
          ios: {
            moduleName: 'DifferentModuleName',
            outputDir: 'ios/generated', // Different pattern
          },
        },
      };

      const buildGradle = `
apply plugin: 'com.android.library'
buildscript {
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.1'
        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.8.0'
    }
}
android {
    namespace "com.jimmydaddy.imagemarker"
    compileSdkVersion 33
}
`;

      const podspec = `
Pod::Spec.new do |s|
  s.name = "react-native-image-marker"
  s.platform = :ios, "13.0"
  s.swift_version = "5.0"
  
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    s.dependency "React-Codegen"
  end
  
  install_modules_dependencies(s)
end
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr.includes('package.json')) {
          return JSON.stringify(inconsistentPackageJson);
        } else if (pathStr.includes('build.gradle')) {
          return buildGradle;
        } else if (pathStr.includes('podspec')) {
          return podspec;
        } else if (pathStr.includes('gradle.properties')) {
          return 'newArchEnabled=false';
        }
        return '';
      });

      const result =
        ConfigurationSpecValidator.validateConfigurationSpec(version);

      // Property Assertion 1: System should detect cross-platform inconsistencies
      expect(result.warnings.length).toBeGreaterThan(0);

      // Property Assertion 2: System should provide recommendations for consistency
      const hasConsistencyRecommendations = result.recommendations.some(
        (rec) =>
          rec.includes('consistent') ||
          rec.includes('pattern') ||
          rec.includes('across platforms')
      );
      expect(hasConsistencyRecommendations).toBe(true);

      // Property Assertion 3: Compatibility check should identify cross-platform issues
      expect(result.validationDetails.compatibilityCheck).not.toBeNull();
      expect(
        result.validationDetails.compatibilityCheck?.compatibilityMatrix
          .crossPlatform
      ).toBeDefined();

      // Property Assertion 4: Recommendations should be specific and actionable
      expect(result.recommendations.length).toBeGreaterThan(0);
      const hasSpecificRecommendations = result.recommendations.some(
        (rec) => rec.length > 20 && rec.includes('directory')
      );
      expect(hasSpecificRecommendations).toBe(true);
    });

    test('对于任何配置稳定性问题，系统应该评估并提供稳定性改进建议', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 8: 跨平台配置规范遵循性 - 配置稳定性
       * Validates: Requirements 5.3, 5.4, 5.5
       */

      const version = '0.73.6';
      vi.spyOn(
        CrossPlatformVersionDetector,
        'detectReactNativeVersion'
      ).mockReturnValue(version);

      // Test Case: Configuration with stability issues (using unstable version specifiers)
      const unstablePackageJson = {
        name: 'react-native-image-marker',
        dependencies: {
          'react': '^18.2.0',
          'react-native': '~0.73.0',
        },
        devDependencies: {
          typescript: '*',
        },
        codegenConfig: {
          name: 'RNImageMarkerSpec',
          type: 'modules',
          jsSrcsDir: 'src',
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

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const pathStr = String(filePath);
        if (pathStr.includes('package.json')) {
          return JSON.stringify(unstablePackageJson);
        } else if (pathStr.includes('build.gradle')) {
          return `
apply plugin: 'com.android.library'
android {
    namespace "com.jimmydaddy.imagemarker"
    compileSdkVersion 33
}
`;
        } else if (pathStr.includes('podspec')) {
          return `
Pod::Spec.new do |s|
  s.name = "react-native-image-marker"
  s.platform = :ios, "13.0"
end
`;
        } else if (pathStr.includes('gradle.properties')) {
          return 'newArchEnabled=false';
        }
        return '';
      });

      const result =
        ConfigurationSpecValidator.validateConfigurationSpec(version);

      // Property Assertion 1: System should check configuration stability
      expect(result.validationDetails.stabilityCheck).not.toBeNull();

      // Property Assertion 2: System should detect unstable dependency versions
      const stabilityCheck = result.validationDetails.stabilityCheck;
      expect(stabilityCheck?.issues.length).toBeGreaterThan(0);

      // Property Assertion 3: Stability score should reflect configuration quality
      expect(stabilityCheck?.stabilityScore).toBeDefined();
      expect(stabilityCheck?.stabilityScore).toBeLessThan(100);

      // Property Assertion 4: System should provide stability improvement recommendations
      expect(stabilityCheck?.recommendations.length).toBeGreaterThan(0);
      const hasStabilityRecommendations = stabilityCheck?.recommendations.some(
        (rec) =>
          rec.includes('exact version') ||
          rec.includes('stability') ||
          rec.includes('version')
      );
      expect(hasStabilityRecommendations).toBe(true);
    });
  });
});
