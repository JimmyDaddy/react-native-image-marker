import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformVersionDetector } from '../CrossPlatformVersionDetector';

// Mock fs module for testing
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('Cross-Platform Version Detection Properties', () => {
  beforeEach(() => {
    // Reset detector state before each test
    CrossPlatformVersionDetector.reset();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
  });

  describe('Property 1: 跨平台版本自适应配置', () => {
    test('对于任何支持的 React Native 版本和平台，系统应该自动检测版本并选择对应的配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 1: 跨平台版本自适应配置
       * Validates: Requirements 1.2, 5.1, 6.1, 6.3, 7.1, 7.3
       */

      // Test supported versions
      const supportedVersions = [
        '0.73.0',
        '0.73.3',
        '0.73.9',
        '0.81.0',
        '0.81.5',
        '0.80.0',
        '0.82.0',
        '0.85.0',
      ];

      supportedVersions.forEach((version) => {
        // Reset for each version test
        CrossPlatformVersionDetector.reset();

        // Mock package.json with specific React Native version
        const mockPackageJson = {
          dependencies: {
            'react-native': version,
          },
        };

        mockFs.existsSync.mockImplementation((filePath: any) => {
          return filePath.toString().includes('package.json');
        });

        mockFs.readFileSync.mockImplementation((filePath: any) => {
          if (filePath.toString().includes('package.json')) {
            return JSON.stringify(mockPackageJson);
          }
          return '{}';
        });

        // Test version detection
        const detectedVersion =
          CrossPlatformVersionDetector.detectReactNativeVersion();
        expect(detectedVersion).toBe(version);
        expect(
          CrossPlatformVersionDetector.isVersionSupported(detectedVersion)
        ).toBe(true);

        // Test configuration strategy selection
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy();
        expect(strategy).toBeDefined();

        // Test Android configuration
        const androidConfig = strategy.getAndroidConfig();
        expect(androidConfig).toBeDefined();
        expect(androidConfig.gradleConfig).toBeDefined();
        expect(androidConfig.buildConfig).toBeDefined();
        expect(androidConfig.codegenConfig).toBeDefined();

        // Verify version-specific Android configuration
        if (version.startsWith('0.73')) {
          expect(androidConfig.gradleConfig.pluginVersion).toBe('8.1.0');
          expect(androidConfig.codegenConfig.location).toBe('package.json');
        } else if (version.startsWith('0.81')) {
          expect(androidConfig.gradleConfig.pluginVersion).toBe('8.3.0');
          expect(androidConfig.codegenConfig.location).toBe('build.gradle');
        } else if (version.startsWith('0.8')) {
          expect(androidConfig.gradleConfig.pluginVersion).toBe('8.4.0');
          expect(androidConfig.codegenConfig.location).toBe('build.gradle');
        }

        // Test iOS configuration
        const iosConfig = strategy.getIOSConfig();
        expect(iosConfig).toBeDefined();
        expect(iosConfig.podspecConfig).toBeDefined();
        expect(iosConfig.buildConfig).toBeDefined();
        expect(iosConfig.codegenConfig).toBeDefined();

        // Verify version-specific iOS configuration
        if (version.startsWith('0.73')) {
          expect(iosConfig.podspecConfig.deploymentTarget).toBe('13.0');
          expect(iosConfig.podspecConfig.xcodeVersion).toBe('15.0');
          expect(iosConfig.codegenConfig.location).toBe('package.json');
        } else if (version.startsWith('0.81')) {
          expect(iosConfig.podspecConfig.deploymentTarget).toBe('13.4');
          expect(iosConfig.podspecConfig.xcodeVersion).toBe('15.3');
          expect(iosConfig.codegenConfig.location).toBe('podspec');
        } else if (version.startsWith('0.8')) {
          expect(iosConfig.podspecConfig.deploymentTarget).toBe('14.0');
          expect(iosConfig.podspecConfig.xcodeVersion).toBe('16.0');
          expect(iosConfig.codegenConfig.location).toBe('podspec');
        }

        // Test Codegen configuration
        const codegenConfig = strategy.getCodegenConfig();
        expect(codegenConfig).toBeDefined();
        expect(codegenConfig.name).toBe('RNImageMarkerSpec');
        expect(codegenConfig.type).toBe('modules');
        expect(codegenConfig.android).toBeDefined();
        expect(codegenConfig.ios).toBeDefined();

        // Test Expo configuration
        const expoConfig = strategy.getExpoConfig();
        expect(expoConfig).toBeDefined();
        expect(expoConfig.supportsNewArchitecture).toBe(true);
        expect(expoConfig.supportsPrebuild).toBe(true);

        // Verify version-specific Expo configuration
        if (version.startsWith('0.73')) {
          expect(expoConfig.sdkVersion).toBe('50.0.0');
        } else if (version.startsWith('0.81')) {
          expect(expoConfig.sdkVersion).toBe('52.0.0');
        } else if (version.startsWith('0.8')) {
          expect(expoConfig.sdkVersion).toBe('53.0.0');
        }
      });
    });

    test('系统应该检测平台能力并提供相应的配置选项', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 1: 跨平台版本自适应配置 - 平台能力检测
       * Validates: Requirements 1.2, 5.1, 6.1, 6.3, 7.1, 7.3
       */

      // Mock different platform configurations
      const testScenarios = [
        {
          name: 'Android New Architecture Enabled',
          mockFiles: {
            'android/gradle.properties':
              'newArchEnabled=true\norg.gradle.jvmargs=-Xmx2048m',
          },
          expectedAndroid: {
            hasNewArchitecture: true,
          },
        },
        {
          name: 'iOS New Architecture Enabled',
          mockFiles: {
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
          },
          expectedIOS: {
            hasNewArchitecture: true,
          },
        },
        {
          name: 'Expo Project',
          mockFiles: {
            'package.json': JSON.stringify({
              dependencies: {
                'react-native': '0.73.3',
                'expo': '^50.0.0',
              },
            }),
          },
          expectedExpo: {
            supportsPrebuild: true,
          },
        },
      ];

      testScenarios.forEach((scenario) => {
        CrossPlatformVersionDetector.reset();

        // Setup file system mocks
        mockFs.existsSync.mockImplementation((filePath: any) => {
          const relativePath = path.relative(
            process.cwd(),
            filePath.toString()
          );
          return Object.keys(scenario.mockFiles).some(
            (mockPath) =>
              relativePath.includes(mockPath) ||
              filePath.toString().includes(mockPath)
          );
        });

        mockFs.readFileSync.mockImplementation((filePath: any) => {
          const relativePath = path.relative(
            process.cwd(),
            filePath.toString()
          );
          for (const [mockPath, content] of Object.entries(
            scenario.mockFiles
          )) {
            if (
              relativePath.includes(mockPath) ||
              filePath.toString().includes(mockPath)
            ) {
              return content;
            }
          }
          return '{}';
        });

        // Test platform capabilities detection
        const capabilities =
          CrossPlatformVersionDetector.detectPlatformCapabilities();

        expect(capabilities).toBeDefined();
        expect(capabilities.android).toBeDefined();
        expect(capabilities.ios).toBeDefined();
        expect(capabilities.expo).toBeDefined();

        // Verify Android capabilities
        expect(typeof capabilities.android.hasNewArchitecture).toBe('boolean');
        expect(typeof capabilities.android.gradlePluginVersion).toBe('string');
        expect(Array.isArray(capabilities.android.supportedSDKVersions)).toBe(
          true
        );
        expect(
          capabilities.android.supportedSDKVersions.length
        ).toBeGreaterThan(0);

        if (scenario.expectedAndroid) {
          expect(capabilities.android.hasNewArchitecture).toBe(
            scenario.expectedAndroid.hasNewArchitecture
          );
        }

        // Verify iOS capabilities
        expect(typeof capabilities.ios.hasNewArchitecture).toBe('boolean');
        expect(typeof capabilities.ios.xcodeVersion).toBe('string');
        expect(Array.isArray(capabilities.ios.supportedIOSVersions)).toBe(true);
        expect(capabilities.ios.supportedIOSVersions.length).toBeGreaterThan(0);

        if (scenario.expectedIOS) {
          expect(capabilities.ios.hasNewArchitecture).toBe(
            scenario.expectedIOS.hasNewArchitecture
          );
        }

        // Verify Expo capabilities
        expect(typeof capabilities.expo.sdkVersion).toBe('string');
        expect(typeof capabilities.expo.supportsPrebuild).toBe('boolean');
        expect(typeof capabilities.expo.supportsNewArchitecture).toBe(
          'boolean'
        );

        if (scenario.expectedExpo) {
          expect(capabilities.expo.supportsPrebuild).toBe(
            scenario.expectedExpo.supportsPrebuild
          );
        }

        console.log(`Platform capabilities verified for: ${scenario.name}`);
      });
    });

    test('系统应该处理版本检测失败的情况并提供合理的默认配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 1: 跨平台版本自适应配置 - 错误处理和默认配置
       * Validates: Requirements 1.2, 5.1, 6.1, 6.3, 7.1, 7.3
       */

      const errorScenarios = [
        {
          name: 'No package.json found',
          mockSetup: () => {
            mockFs.existsSync.mockReturnValue(false);
          },
        },
        {
          name: 'Invalid package.json',
          mockSetup: () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockImplementation(() => {
              throw new Error('File read error');
            });
          },
        },
        {
          name: 'Malformed package.json',
          mockSetup: () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue('invalid json');
          },
        },
        {
          name: 'No React Native dependency',
          mockSetup: () => {
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(
              JSON.stringify({
                dependencies: {
                  react: '^18.0.0',
                },
              })
            );
          },
        },
      ];

      errorScenarios.forEach((scenario) => {
        CrossPlatformVersionDetector.reset();
        scenario.mockSetup();

        // Version detection should not throw errors
        expect(() => {
          const version =
            CrossPlatformVersionDetector.detectReactNativeVersion();
          expect(typeof version).toBe('string');
          expect(version.length).toBeGreaterThan(0);

          // Should default to a supported version
          expect(CrossPlatformVersionDetector.isVersionSupported(version)).toBe(
            true
          );
        }).not.toThrow();

        // Configuration strategy should still work with default version
        expect(() => {
          const strategy =
            CrossPlatformVersionDetector.getConfigurationStrategy();
          expect(strategy).toBeDefined();

          const androidConfig = strategy.getAndroidConfig();
          const iosConfig = strategy.getIOSConfig();
          const codegenConfig = strategy.getCodegenConfig();
          const expoConfig = strategy.getExpoConfig();

          expect(androidConfig).toBeDefined();
          expect(iosConfig).toBeDefined();
          expect(codegenConfig).toBeDefined();
          expect(expoConfig).toBeDefined();
        }).not.toThrow();

        // Platform capabilities detection should not throw errors
        expect(() => {
          const capabilities =
            CrossPlatformVersionDetector.detectPlatformCapabilities();
          expect(capabilities).toBeDefined();
          expect(capabilities.android).toBeDefined();
          expect(capabilities.ios).toBeDefined();
          expect(capabilities.expo).toBeDefined();
        }).not.toThrow();

        console.log(`Error handling verified for: ${scenario.name}`);
      });
    });

    test('系统应该支持版本缓存和重置功能', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 1: 跨平台版本自适应配置 - 缓存和重置
       * Validates: Requirements 1.2, 5.1, 6.1, 6.3, 7.1, 7.3
       */

      // Setup mock for consistent version detection
      const mockPackageJson = {
        dependencies: {
          'react-native': '0.73.3',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      // First detection should call file system
      const version1 = CrossPlatformVersionDetector.detectReactNativeVersion();
      expect(version1).toBe('0.73.3');
      expect(mockFs.readFileSync).toHaveBeenCalled();

      // Reset call count
      mockFs.readFileSync.mockClear();

      // Second detection should use cache (no file system calls)
      const version2 = CrossPlatformVersionDetector.detectReactNativeVersion();
      expect(version2).toBe('0.73.3');
      expect(version2).toBe(version1);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();

      // Configuration strategy should also be cached
      const strategy1 = CrossPlatformVersionDetector.getConfigurationStrategy();
      const strategy2 = CrossPlatformVersionDetector.getConfigurationStrategy();
      expect(strategy1).toBe(strategy2);

      // Platform capabilities should be cached
      const capabilities1 =
        CrossPlatformVersionDetector.detectPlatformCapabilities();
      const capabilities2 =
        CrossPlatformVersionDetector.detectPlatformCapabilities();
      expect(capabilities1).toBe(capabilities2);

      // Reset should clear all caches
      CrossPlatformVersionDetector.reset();

      // After reset, should detect again
      const version3 = CrossPlatformVersionDetector.detectReactNativeVersion();
      expect(version3).toBe('0.73.3');
      expect(mockFs.readFileSync).toHaveBeenCalled();

      // New strategy instance should be created
      const strategy3 = CrossPlatformVersionDetector.getConfigurationStrategy();
      expect(strategy3).not.toBe(strategy1);

      // New capabilities instance should be created
      const capabilities3 =
        CrossPlatformVersionDetector.detectPlatformCapabilities();
      expect(capabilities3).not.toBe(capabilities1);

      console.log('Caching and reset functionality verified');
    });

    test('系统应该正确处理版本字符串的标准化', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 1: 跨平台版本自适应配置 - 版本字符串标准化
       * Validates: Requirements 1.2, 5.1, 6.1, 6.3, 7.1, 7.3
       */

      const versionTestCases = [
        { input: '^0.73.3', expected: '0.73.3' },
        { input: '~0.81.0', expected: '0.81.0' },
        { input: '>=0.80.0', expected: '0.80.0' },
        { input: '0.73', expected: '0.73.0' },
        { input: '0.81.5-rc.0', expected: '0.81.5' },
        { input: '0.82.0-alpha.1', expected: '0.82.0' },
        { input: 'latest', expected: 'latest' }, // Should handle non-numeric versions
      ];

      versionTestCases.forEach((testCase) => {
        CrossPlatformVersionDetector.reset();

        const mockPackageJson = {
          dependencies: {
            'react-native': testCase.input,
          },
        };

        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

        const detectedVersion =
          CrossPlatformVersionDetector.detectReactNativeVersion();

        if (testCase.expected !== 'latest') {
          expect(detectedVersion).toBe(testCase.expected);

          // Should be able to get configuration for normalized version
          expect(() => {
            const strategy =
              CrossPlatformVersionDetector.getConfigurationStrategy();
            expect(strategy).toBeDefined();
          }).not.toThrow();
        } else {
          // For non-standard versions, should still return a string
          expect(typeof detectedVersion).toBe('string');
        }

        console.log(
          `Version normalization verified: ${testCase.input} -> ${detectedVersion}`
        );
      });
    });

    test('系统应该支持多种版本检测源', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 1: 跨平台版本自适应配置 - 多源版本检测
       * Validates: Requirements 1.2, 5.1, 6.1, 6.3, 7.1, 7.3
       */

      const detectionSources = [
        {
          name: 'Project package.json dependencies',
          mockSetup: () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
              return (
                filePath.toString().includes('package.json') &&
                !filePath.toString().includes('node_modules')
              );
            });
            mockFs.readFileSync.mockReturnValue(
              JSON.stringify({
                dependencies: { 'react-native': '0.73.3' },
              })
            );
          },
          expectedVersion: '0.73.3',
        },
        {
          name: 'Project package.json devDependencies',
          mockSetup: () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
              return (
                filePath.toString().includes('package.json') &&
                !filePath.toString().includes('node_modules')
              );
            });
            mockFs.readFileSync.mockReturnValue(
              JSON.stringify({
                devDependencies: { 'react-native': '0.81.0' },
              })
            );
          },
          expectedVersion: '0.81.0',
        },
        {
          name: 'React Native package.json in node_modules',
          mockSetup: () => {
            mockFs.existsSync.mockImplementation((filePath: any) => {
              const pathStr = filePath.toString();
              if (
                pathStr.includes('package.json') &&
                !pathStr.includes('node_modules')
              ) {
                return true; // Project package.json exists but no RN dependency
              }
              return pathStr.includes('node_modules/react-native/package.json');
            });
            mockFs.readFileSync.mockImplementation((filePath: any) => {
              if (
                filePath
                  .toString()
                  .includes('node_modules/react-native/package.json')
              ) {
                return JSON.stringify({ version: '0.82.0' });
              }
              return JSON.stringify({}); // Empty project package.json
            });
          },
          expectedVersion: '0.82.0',
        },
      ];

      detectionSources.forEach((source) => {
        CrossPlatformVersionDetector.reset();
        source.mockSetup();

        const detectedVersion =
          CrossPlatformVersionDetector.detectReactNativeVersion();
        expect(detectedVersion).toBe(source.expectedVersion);

        // Should be able to get appropriate configuration
        const strategy =
          CrossPlatformVersionDetector.getConfigurationStrategy();
        expect(strategy).toBeDefined();

        console.log(`Version detection verified from: ${source.name}`);
      });
    });
  });
});
