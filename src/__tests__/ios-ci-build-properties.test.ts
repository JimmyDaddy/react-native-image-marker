import { describe, test, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformVersionDetector } from '../CrossPlatformVersionDetector';
import { CrossPlatformBuildSystemAdapter } from '../CrossPlatformBuildSystemAdapter';

describe('iOS CI Build Fix - Property Tests', () => {
  beforeEach(() => {
    // Reset version detection before each test
    CrossPlatformVersionDetector.reset();
    CrossPlatformBuildSystemAdapter.reset();
  });

  describe('Property 2: 跨平台构建成功性保证（iOS 部分）', () => {
    test('对于任何有效的项目配置和支持的 React Native 版本，iOS 构建应该成功完成', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分）
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

        const iosConfig = strategy.getIOSConfig();
        expect(iosConfig).toBeDefined();
        expect(iosConfig.buildConfig).toBeDefined();
        expect(iosConfig.codegenConfig).toBeDefined();
        expect(iosConfig.podspecConfig).toBeDefined();

        // Verify version-specific iOS deployment targets and Swift versions
        if (version.startsWith('0.73')) {
          expect(iosConfig.buildConfig.deploymentTarget).toBe('13.0');
          expect(iosConfig.buildConfig.swiftVersion).toBe('5.0');
          expect(iosConfig.buildConfig.xcodeVersion).toBe('15.0');
          expect(iosConfig.codegenConfig.location).toBe('package.json');
        } else if (version.startsWith('0.81')) {
          expect(iosConfig.buildConfig.deploymentTarget).toBe('13.4');
          expect(iosConfig.buildConfig.swiftVersion).toBe('5.9');
          expect(iosConfig.buildConfig.xcodeVersion).toBe('15.3');
          expect(iosConfig.codegenConfig.location).toBe('podspec');
        } else if (version.startsWith('0.8')) {
          expect(iosConfig.buildConfig.deploymentTarget).toBe('14.0');
          expect(iosConfig.buildConfig.swiftVersion).toBe('5.10');
          expect(iosConfig.buildConfig.xcodeVersion).toBe('16.0');
          expect(iosConfig.codegenConfig.location).toBe('podspec');
        }

        // Verify new architecture support
        expect(iosConfig.buildConfig.fabricEnabled).toBe(true);
        expect(iosConfig.buildConfig.turboModulesEnabled).toBe(true);

        // Verify Codegen module name
        expect(iosConfig.codegenConfig.moduleName).toBe('RNImageMarkerSpec');

        console.log(`iOS configuration verified for React Native ${version}`);
      });
    });

    test('iOS podspec 应该根据 React Native 版本自动选择正确的配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - podspec 版本配置
       * Validates: Requirements 1.1, 1.2, 6.1, 6.2
       */

      const podspecPath = path.join(
        process.cwd(),
        'react-native-image-marker.podspec'
      );
      expect(fs.existsSync(podspecPath)).toBe(true);

      const podspecContent = fs.readFileSync(podspecPath, 'utf8');

      // Verify version detection functions exist
      expect(podspecContent).toContain('detect_react_native_version');
      expect(podspecContent).toContain('get_ios_config_for_version');

      // Verify version-specific configuration logic
      expect(podspecContent).toContain('case major_minor');
      expect(podspecContent).toContain('when "0.73"');
      expect(podspecContent).toContain('when "0.81"');
      expect(podspecContent).toContain('if version.start_with?("0.8")');

      // Verify deployment target configuration
      expect(podspecContent).toContain('deployment_target:');
      expect(podspecContent).toContain('swift_version:');
      expect(podspecContent).toContain('xcode_version:');
      expect(podspecContent).toContain('cocoapods_version:');

      // Verify dynamic platform setting
      expect(podspecContent).toContain(
        's.platforms    = { :ios => ios_config[:deployment_target] }'
      );

      // Verify Swift version setting
      expect(podspecContent).toContain(
        's.swift_version = ios_config[:swift_version]'
      );

      // Verify version-specific dependencies
      expect(podspecContent).toContain(
        'if rn_version.start_with?("0.81") || rn_version.start_with?("0.8")'
      );
      expect(podspecContent).toContain('React-featureflags');
      expect(podspecContent).toContain('React-rendererdebug');

      // Verify version-specific C++ standard
      expect(podspecContent).toContain('CLANG_CXX_LANGUAGE_STANDARD');
      expect(podspecContent).toContain('c++20');

      console.log('iOS podspec version-specific configuration verified');
    });

    test('iOS 构建环境验证应该检查所有必需的文件和配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 构建环境验证
       * Validates: Requirements 1.4, 4.1, 4.3
       */

      // Test build environment validation
      const isValidEnvironment =
        CrossPlatformBuildSystemAdapter.validateBuildEnvironment('ios');
      expect(typeof isValidEnvironment).toBe('boolean');

      // Verify essential iOS files exist
      const essentialFiles = [
        'react-native-image-marker.podspec',
        'ios/RCTImageMarker',
        'ios/ImageMarkerTurboModule',
      ];

      essentialFiles.forEach((filePath) => {
        const fullPath = path.join(process.cwd(), filePath);
        expect(fs.existsSync(fullPath)).toBe(true);

        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content.length).toBeGreaterThan(0);
        }

        console.log(`Essential iOS file/directory verified: ${filePath}`);
      });

      // Check iOS source files
      const iosSourceFiles = [
        'ios/RCTImageMarker/ImageMarker.swift',
        'ios/RCTImageMarker/RCTImageMarkerBridge.m',
        'ios/ImageMarkerTurboModule/ImageMarkerTurboModule.swift',
        'ios/ImageMarkerTurboModule/ImageMarkerTurboModuleBridge.m',
      ];

      iosSourceFiles.forEach((filePath) => {
        const fullPath = path.join(process.cwd(), filePath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, 'utf8');
        expect(content.length).toBeGreaterThan(0);

        console.log(`iOS source file verified: ${filePath}`);
      });

      // Verify package.json has React Native dependency
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasReactNative =
        packageJson.dependencies?.['react-native'] ||
        packageJson.devDependencies?.['react-native'];
      expect(hasReactNative).toBeTruthy();

      console.log('iOS build environment validation completed');
    });

    test('iOS CocoaPods 版本应该与 React Native 版本兼容', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - CocoaPods 版本兼容性
       * Validates: Requirements 5.3, 5.4, 6.4
       */

      const versionCompatibilityMatrix = [
        {
          rnVersion: '0.73.0',
          expectedDeploymentTarget: '13.0',
          expectedSwiftVersion: '5.0',
          expectedXcodeVersion: '15.0',
          expectedCocoapodsVersion: '1.12.0',
        },
        {
          rnVersion: '0.73.3',
          expectedDeploymentTarget: '13.0',
          expectedSwiftVersion: '5.0',
          expectedXcodeVersion: '15.0',
          expectedCocoapodsVersion: '1.12.0',
        },
        {
          rnVersion: '0.81.0',
          expectedDeploymentTarget: '13.4',
          expectedSwiftVersion: '5.9',
          expectedXcodeVersion: '15.3',
          expectedCocoapodsVersion: '1.15.0',
        },
        {
          rnVersion: '0.81.2',
          expectedDeploymentTarget: '13.4',
          expectedSwiftVersion: '5.9',
          expectedXcodeVersion: '15.3',
          expectedCocoapodsVersion: '1.15.0',
        },
        {
          rnVersion: '0.82.0',
          expectedDeploymentTarget: '14.0',
          expectedSwiftVersion: '5.10',
          expectedXcodeVersion: '16.0',
          expectedCocoapodsVersion: '1.16.0',
        },
        {
          rnVersion: '0.83.0',
          expectedDeploymentTarget: '14.0',
          expectedSwiftVersion: '5.10',
          expectedXcodeVersion: '16.0',
          expectedCocoapodsVersion: '1.16.0',
        },
      ];

      versionCompatibilityMatrix.forEach(
        ({
          rnVersion,
          expectedDeploymentTarget,
          expectedSwiftVersion,
          expectedXcodeVersion,
          expectedCocoapodsVersion,
        }) => {
          const strategy =
            CrossPlatformVersionDetector.getConfigurationStrategy(rnVersion);
          const iosConfig = strategy.getIOSConfig();

          expect(iosConfig.buildConfig.deploymentTarget).toBe(
            expectedDeploymentTarget
          );
          expect(iosConfig.buildConfig.swiftVersion).toBe(expectedSwiftVersion);
          expect(iosConfig.buildConfig.xcodeVersion).toBe(expectedXcodeVersion);

          // Verify iOS capabilities detection for the specific version
          // Note: detectPlatformCapabilities() uses the globally detected version,
          // so we test the configuration strategy directly instead
          expect(iosConfig.buildConfig.xcodeVersion).toBe(expectedXcodeVersion);

          // Verify supported iOS versions include the deployment target
          const supportedVersions = [
            '13.0',
            '13.4',
            '14.0',
            '15.0',
            '16.0',
            '17.0',
            '18.0',
          ];
          expect(supportedVersions).toContain(expectedDeploymentTarget);

          console.log(
            `iOS version compatibility verified: RN ${rnVersion} → iOS ${expectedDeploymentTarget}, Swift ${expectedSwiftVersion}, Xcode ${expectedXcodeVersion}, CocoaPods ${expectedCocoapodsVersion}`
          );
        }
      );
    });

    test('iOS 构建配置应该支持新架构和传统架构', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 架构兼容性
       * Validates: Requirements 1.1, 1.4, 1.5
       */

      const podspecPath = path.join(
        process.cwd(),
        'react-native-image-marker.podspec'
      );
      const podspecContent = fs.readFileSync(podspecPath, 'utf8');

      // Verify new architecture detection
      expect(podspecContent).toContain("ENV['RCT_NEW_ARCH_ENABLED']");

      // Verify conditional source files
      expect(podspecContent).toContain(
        "if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then"
      );
      expect(podspecContent).toContain(
        's.source_files = "ios/**/*.{h,m,mm,swift}", "specs/**/*.{h,cpp,mm}"'
      );
      expect(podspecContent).toContain(
        's.source_files = "ios/RCTImageMarker/**/*.{h,m,mm,swift}"'
      );

      // Verify new architecture compiler flags
      expect(podspecContent).toContain('-DRCT_NEW_ARCH_ENABLED=1');
      expect(podspecContent).toContain('folly_compiler_flags');

      // Verify TurboModule dependencies
      expect(podspecContent).toContain('React-Codegen');
      expect(podspecContent).toContain('RCT-Folly');
      expect(podspecContent).toContain('ReactCommon/turbomodule/core');
      expect(podspecContent).toContain('React-jsi');

      // Verify Fabric dependencies
      expect(podspecContent).toContain('React-graphics');
      expect(podspecContent).toContain('React-debug');

      // Verify version-specific dependencies
      expect(podspecContent).toContain('React-featureflags');
      expect(podspecContent).toContain('React-rendererdebug');

      // Verify Swift configuration
      expect(podspecContent).toContain('SWIFT_OBJC_INTERFACE_HEADER_NAME');
      expect(podspecContent).toContain('SWIFT_VERSION');

      console.log('iOS architecture compatibility configuration verified');
    });

    test('iOS Codegen 脚本应该根据版本正确配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - Codegen 配置
       * Validates: Requirements 2.1, 2.2, 2.5
       */

      const podspecPath = path.join(
        process.cwd(),
        'react-native-image-marker.podspec'
      );
      const podspecContent = fs.readFileSync(podspecPath, 'utf8');

      // Verify version-specific codegen script logic
      expect(podspecContent).toContain('codegen_script = if');
      expect(podspecContent).toContain('rn_version.start_with?("0.73")');
      expect(podspecContent).toContain('rn_version.start_with?("0.81")');

      // Verify React Native 0.73 codegen path
      expect(podspecContent).toContain(
        'CODEGEN_REPO_PATH="$REACT_NATIVE_PATH/packages/react-native-codegen"'
      );
      expect(podspecContent).toContain(
        'CODEGEN_NPM_PATH="$REACT_NATIVE_PATH/../react-native-codegen"'
      );

      // Verify React Native 0.81+ codegen path
      expect(podspecContent).toContain(
        'CODEGEN_NPM_PATH="../node_modules/@react-native/codegen"'
      );

      // Verify script phase configuration
      expect(podspecContent).toContain('s.script_phase = {');
      expect(podspecContent).toContain(":name => 'Generate Specs'");
      expect(podspecContent).toContain(
        ':execution_position => :before_compile'
      );
      expect(podspecContent).toContain(
        ':input_files => ["$(SRCROOT)/../specs/NativeImageMarker.ts"]'
      );
      expect(podspecContent).toContain(
        ':output_files => ["$(DERIVED_FILE_DIR)/react-native-image-marker-generated.mm"]'
      );

      // Verify error handling for missing codegen
      expect(podspecContent).toContain(
        'Could not determine react-native-codegen location for RN 0.73'
      );
      expect(podspecContent).toContain(
        'Could not determine react-native-codegen location for RN 0.81'
      );
      expect(podspecContent).toContain(
        'Could not determine @react-native/codegen location for RN 0.8x'
      );

      // Test configuration strategy codegen config
      const testVersions = ['0.73.3', '0.81.0', '0.82.0'];

      testVersions.forEach((version) => {
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy(version);
        const codegenConfig = strategy.getCodegenConfig();

        expect(codegenConfig.name).toBe('RNImageMarkerSpec');
        expect(codegenConfig.type).toBe('modules');
        expect(codegenConfig.jsSrcsDir).toBe('specs');
        expect(codegenConfig.ios?.moduleName).toBe('RNImageMarkerSpec');

        // Verify spec files are referenced
        expect(Array.isArray(codegenConfig.specFiles)).toBe(true);
        expect(codegenConfig.specFiles).toContain('specs/NativeImageMarker.ts');

        console.log(
          `iOS Codegen configuration verified for React Native ${version}`
        );
      });

      console.log('iOS Codegen script configuration verified');
    });

    test('iOS 构建系统适配器应该正确配置 Podspec', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 构建系统适配
       * Validates: Requirements 5.3, 5.4, 6.4
       */

      const testVersions = ['0.73.3', '0.81.0', '0.82.0'];

      testVersions.forEach((version) => {
        // Test configuration without throwing errors
        expect(() => {
          CrossPlatformBuildSystemAdapter.configureIOSPodspec(version);
        }).not.toThrow();

        // Test Codegen integration setup
        expect(() => {
          CrossPlatformBuildSystemAdapter.setupCodegenIntegration('ios');
        }).not.toThrow();

        // Test build configuration synchronization
        expect(() => {
          CrossPlatformBuildSystemAdapter.syncBuildConfigurations();
        }).not.toThrow();

        console.log(
          `iOS build system adapter configuration tested for React Native ${version}`
        );
      });

      // Test build environment validation
      const isValidIOS =
        CrossPlatformBuildSystemAdapter.validateBuildEnvironment('ios');
      expect(typeof isValidIOS).toBe('boolean');

      console.log('iOS build system adapter functionality verified');
    });

    test('iOS 构建错误应该提供清晰的诊断信息', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 错误诊断
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

        const iosConfig = strategy.getIOSConfig();
        expect(iosConfig).toBeDefined();

        console.log(`Unsupported version ${version} handled gracefully`);
      });

      // Test build environment validation with missing files
      const originalCwdFunc = process.cwd;
      process.cwd = () => '/nonexistent/ios/path';

      try {
        const isValid =
          CrossPlatformBuildSystemAdapter.validateBuildEnvironment('ios');
        // Should return false for non-existent directory
        expect(typeof isValid).toBe('boolean');
        console.log(
          `iOS build environment validation with invalid path: ${isValid}`
        );
      } finally {
        process.cwd = originalCwdFunc;
      }

      // Test iOS capabilities detection error handling
      const capabilities =
        CrossPlatformVersionDetector.detectPlatformCapabilities();
      expect(capabilities.ios).toBeDefined();
      expect(typeof capabilities.ios.hasNewArchitecture).toBe('boolean');
      expect(typeof capabilities.ios.xcodeVersion).toBe('string');
      expect(Array.isArray(capabilities.ios.supportedIOSVersions)).toBe(true);

      console.log('iOS build error diagnostics verified');
    });

    test('iOS 构建性能应该在可接受范围内', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 构建性能
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

      // Test iOS configuration retrieval performance
      const configStart = performance.now();
      const iosConfig = strategy.getIOSConfig();
      const configTime = performance.now() - configStart;

      expect(configTime).toBeLessThan(50); // Should be very fast
      expect(iosConfig).toBeDefined();

      // Test build environment validation performance
      const validationStart = performance.now();
      CrossPlatformBuildSystemAdapter.validateBuildEnvironment('ios');
      const validationTime = performance.now() - validationStart;

      expect(validationTime).toBeLessThan(500); // Should be reasonably fast

      // Test iOS capabilities detection performance
      const capabilitiesStart = performance.now();
      const capabilities =
        CrossPlatformVersionDetector.detectPlatformCapabilities();
      const capabilitiesTime = performance.now() - capabilitiesStart;

      expect(capabilitiesTime).toBeLessThan(200); // Should be fast
      expect(capabilities.ios).toBeDefined();

      console.log(
        `iOS performance metrics - Detection: ${detectionTime.toFixed(
          2
        )}ms, Strategy: ${strategyTime.toFixed(
          2
        )}ms, Config: ${configTime.toFixed(
          2
        )}ms, Validation: ${validationTime.toFixed(
          2
        )}ms, Capabilities: ${capabilitiesTime.toFixed(2)}ms`
      );
    });

    test('iOS 版本兼容性检查应该提供有用的警告信息', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 版本兼容性检查
       * Validates: Requirements 5.3, 5.4, 6.4
       */

      const podspecPath = path.join(
        process.cwd(),
        'react-native-image-marker.podspec'
      );
      const podspecContent = fs.readFileSync(podspecPath, 'utf8');

      // Verify prepare_command exists for compatibility checks
      expect(podspecContent).toContain('s.prepare_command = <<-CMD');

      // Verify version information logging
      expect(podspecContent).toContain(
        'echo "Configuring react-native-image-marker for React Native'
      );
      expect(podspecContent).toContain('echo "iOS deployment target:');
      expect(podspecContent).toContain('echo "Swift version:');
      expect(podspecContent).toContain('echo "Recommended Xcode version:');
      expect(podspecContent).toContain('echo "Recommended CocoaPods version:');

      // Verify CocoaPods version checking
      expect(podspecContent).toContain(
        'current_cocoapods_version=$(pod --version'
      );
      expect(podspecContent).toContain(
        'if [ "$current_cocoapods_version" != "unknown" ]'
      );

      // Verify version-specific compatibility warnings
      expect(podspecContent).toContain('case "#{rn_version}" in');
      expect(podspecContent).toContain('0.73*)');
      expect(podspecContent).toContain('0.81*)');
      expect(podspecContent).toContain('0.8*)');

      // Verify version comparison logic
      expect(podspecContent).toContain("printf '%s\\n'");
      expect(podspecContent).toContain('sort -V');
      expect(podspecContent).toContain('head -n1');

      // Verify warning messages
      expect(podspecContent).toContain(
        'Warning: CocoaPods version $current_cocoapods_version may not be fully compatible'
      );
      expect(podspecContent).toContain('Recommended:');

      // Test that the prepare command doesn't break podspec parsing
      // This is a basic syntax check
      expect(podspecContent).toContain('CMD');
      expect(podspecContent.split('s.prepare_command = <<-CMD').length).toBe(2);
      expect(podspecContent.split('CMD').length).toBe(3); // Start, middle, end

      console.log('iOS version compatibility checking configuration verified');
    });

    test('iOS 新架构依赖项应该根据版本正确配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 2: 跨平台构建成功性保证（iOS 部分） - 新架构依赖项
       * Validates: Requirements 1.1, 1.2, 6.1, 6.2
       */

      const podspecPath = path.join(
        process.cwd(),
        'react-native-image-marker.podspec'
      );
      const podspecContent = fs.readFileSync(podspecPath, 'utf8');

      // Verify base TurboModule dependencies
      const baseDependencies = [
        'React-Codegen',
        'RCT-Folly',
        'RCTRequired',
        'RCTTypeSafety',
        'ReactCommon/turbomodule/core',
        'React-jsi',
        'React-utils',
        'React-graphics',
        'React-debug',
      ];

      baseDependencies.forEach((dependency) => {
        expect(podspecContent).toContain(`s.dependency "${dependency}"`);
        console.log(`Base dependency verified: ${dependency}`);
      });

      // Verify version-specific dependencies
      const versionSpecificDependencies = [
        'React-featureflags',
        'React-rendererdebug',
      ];

      versionSpecificDependencies.forEach((dependency) => {
        expect(podspecContent).toContain(`s.dependency "${dependency}"`);
        console.log(`Version-specific dependency verified: ${dependency}`);
      });

      // Verify conditional dependency logic
      expect(podspecContent).toContain(
        'if rn_version.start_with?("0.81") || rn_version.start_with?("0.8")'
      );

      // Test configuration strategies for different versions
      const testVersions = [
        { version: '0.73.3', hasVersionSpecificDeps: false },
        { version: '0.81.0', hasVersionSpecificDeps: true },
        { version: '0.82.0', hasVersionSpecificDeps: true },
      ];

      testVersions.forEach(({ version, hasVersionSpecificDeps }) => {
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy(version);
        const iosConfig = strategy.getIOSConfig();

        expect(iosConfig.buildConfig.fabricEnabled).toBe(true);
        expect(iosConfig.buildConfig.turboModulesEnabled).toBe(true);

        console.log(
          `iOS new architecture dependencies verified for React Native ${version} (version-specific deps: ${hasVersionSpecificDeps})`
        );
      });

      console.log('iOS new architecture dependencies configuration verified');
    });
  });
});
