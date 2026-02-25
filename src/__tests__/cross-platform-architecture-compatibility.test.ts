import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureDetector } from '../ArchitectureDetector';
import {
  CrossPlatformArchitectureManager,
  type Platform,
} from '../CrossPlatformArchitectureManager';
import { CrossPlatformConfigurationManager } from '../CrossPlatformConfigurationManager';

// Mock fs module for testing
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock React Native modules
vi.mock('react-native', () => ({
  TurboModuleRegistry: {
    get: vi.fn(),
    getEnforcing: vi.fn(),
  },
  UIManager: {
    hasViewManagerConfig: vi.fn(),
  },
}));

describe('Cross-Platform Architecture Compatibility Properties', () => {
  beforeEach(() => {
    // Reset all detector states
    ArchitectureDetector.reset();
    CrossPlatformArchitectureManager.clearArchitectureCache();
    CrossPlatformConfigurationManager.reset();

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('{}');
    mockFs.writeFileSync.mockImplementation(() => {});
  });

  describe('Property 3: 跨平台架构兼容性一致性', () => {
    test('对于任何架构模式和平台组合，系统应该提供功能一致的构建结果', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 3: 跨平台架构兼容性一致性
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5
       */

      const architectureScenarios = [
        {
          name: 'Legacy Architecture - All Platforms',
          architecture: 'legacy' as const,
          platforms: ['android', 'ios', 'expo'] as const,
          mockFiles: {
            'android/gradle.properties':
              'newArchEnabled=false\norg.gradle.jvmargs=-Xmx2048m',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "0"',
            'app.json': JSON.stringify({
              expo: {
                plugins: [
                  ['react-native-image-marker', { newArchEnabled: false }],
                ],
              },
            }),
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
        },
        {
          name: 'New Architecture - All Platforms',
          architecture: 'new' as const,
          platforms: ['android', 'ios', 'expo'] as const,
          mockFiles: {
            'android/gradle.properties':
              'newArchEnabled=true\norg.gradle.jvmargs=-Xmx2048m',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
            'app.json': JSON.stringify({
              expo: {
                plugins: [
                  ['react-native-image-marker', { newArchEnabled: true }],
                ],
              },
            }),
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
        },
        {
          name: 'Mixed Architecture - Android New, iOS Legacy',
          architecture: 'mixed' as const,
          platforms: ['android', 'ios'] as const,
          mockFiles: {
            'android/gradle.properties':
              'newArchEnabled=true\norg.gradle.jvmargs=-Xmx2048m',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "0"',
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
        },
      ];

      architectureScenarios.forEach((scenario) => {
        // Reset state for each scenario
        ArchitectureDetector.reset();
        CrossPlatformArchitectureManager.clearArchitectureCache();

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

        // Test cross-platform architecture detection
        const crossPlatformInfo =
          CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
        expect(crossPlatformInfo).toBeDefined();

        // Verify all platforms are detected
        expect(crossPlatformInfo.javascript).toBeDefined();
        expect(crossPlatformInfo.android).toBeDefined();
        expect(crossPlatformInfo.ios).toBeDefined();
        expect(crossPlatformInfo.expo).toBeDefined();

        // Test architecture consistency validation
        const consistencyResult =
          CrossPlatformArchitectureManager.validateArchitectureConsistency();
        expect(consistencyResult).toBeDefined();

        if (
          scenario.architecture === 'legacy' ||
          scenario.architecture === 'new'
        ) {
          // For consistent architectures, should be consistent
          expect(crossPlatformInfo.isConsistent).toBe(true);
          expect(consistencyResult.isConsistent).toBe(true);
          expect(consistencyResult.inconsistencies).toHaveLength(0);

          // All configured platforms should have the same architecture
          const configuredPlatforms = [
            crossPlatformInfo.android,
            crossPlatformInfo.ios,
            crossPlatformInfo.expo,
          ].filter((info) => info.configurationSource !== 'not_configured');

          if (configuredPlatforms.length > 0) {
            const expectedNewArch = scenario.architecture === 'new';
            configuredPlatforms.forEach((platformInfo) => {
              expect(platformInfo.isNewArchitecture).toBe(expectedNewArch);
            });
          }
        } else {
          // For mixed architectures, should be inconsistent
          expect(crossPlatformInfo.isConsistent).toBe(false);
          expect(consistencyResult.isConsistent).toBe(false);
          expect(consistencyResult.inconsistencies.length).toBeGreaterThan(0);
        }

        // Test architecture recommendations
        const recommendations =
          CrossPlatformArchitectureManager.getArchitectureRecommendations();
        expect(Array.isArray(recommendations)).toBe(true);

        if (!crossPlatformInfo.isConsistent) {
          // Should have consistency fix recommendation
          const consistencyFix = recommendations.find(
            (r) => r.type === 'consistency_fix'
          );
          expect(consistencyFix).toBeDefined();
          expect(consistencyFix?.priority).toBe('high');
        }

        console.log(`Architecture consistency verified for: ${scenario.name}`);
      });
    });

    test('架构切换应该自动调整所有相关的平台配置', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 3: 跨平台架构兼容性一致性 - 架构切换配置同步
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5
       */

      const switchingScenarios = [
        {
          name: 'Switch from Legacy to New Architecture',
          initialArchitecture: 'legacy' as const,
          targetArchitecture: 'new' as const,
          platforms: ['android', 'ios', 'expo'] as const,
        },
        {
          name: 'Switch from New to Legacy Architecture',
          initialArchitecture: 'new' as const,
          targetArchitecture: 'legacy' as const,
          platforms: ['android', 'ios'] as const,
        },
        {
          name: 'Switch Android Only',
          initialArchitecture: 'legacy' as const,
          targetArchitecture: 'new' as const,
          platforms: ['android'] as const,
        },
        {
          name: 'Switch iOS Only',
          initialArchitecture: 'legacy' as const,
          targetArchitecture: 'new' as const,
          platforms: ['ios'] as const,
        },
      ];

      switchingScenarios.forEach((scenario) => {
        // Reset state for each scenario
        ArchitectureDetector.reset();
        CrossPlatformArchitectureManager.clearArchitectureCache();

        // Setup initial configuration files
        const initialFiles = {
          'android/gradle.properties': `newArchEnabled=${
            scenario.initialArchitecture === 'new'
          }\norg.gradle.jvmargs=-Xmx2048m`,
          'ios/Podfile': `ENV["RCT_NEW_ARCH_ENABLED"] = "${
            scenario.initialArchitecture === 'new' ? '1' : '0'
          }"`,
          'app.json': JSON.stringify({
            expo: {
              plugins: [
                [
                  'react-native-image-marker',
                  { newArchEnabled: scenario.initialArchitecture === 'new' },
                ],
              ],
            },
          }),
          'package.json': JSON.stringify({
            dependencies: { 'react-native': '0.73.3' },
          }),
        };

        // Mock file system for initial state
        mockFs.existsSync.mockImplementation((filePath: any) => {
          const relativePath = path.relative(
            process.cwd(),
            filePath.toString()
          );
          return Object.keys(initialFiles).some(
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
          for (const [mockPath, content] of Object.entries(initialFiles)) {
            if (
              relativePath.includes(mockPath) ||
              filePath.toString().includes(mockPath)
            ) {
              return content;
            }
          }
          return '{}';
        });

        // Verify initial state
        const initialInfo =
          CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
        expect(initialInfo).toBeDefined();

        // Perform architecture switch
        const switchResult =
          CrossPlatformArchitectureManager.switchArchitecture(
            scenario.targetArchitecture,
            [...scenario.platforms] // Convert readonly array to mutable array
          );

        expect(switchResult).toBeDefined();
        expect(switchResult.success).toBe(true);
        expect(switchResult.errors).toHaveLength(0);

        // Verify platform-specific results
        scenario.platforms.forEach((platform) => {
          const platformResult = switchResult.platformResults[platform];
          expect(platformResult).toBeDefined();
          expect(platformResult.success).toBe(true);
          expect(platformResult.errors).toHaveLength(0);
          expect(platformResult.configChanges.length).toBeGreaterThan(0);

          // Verify expected configuration changes
          const configChanges = platformResult.configChanges;

          if (platform === 'android') {
            const gradleChange = configChanges.find((c) =>
              c.file.includes('gradle.properties')
            );
            expect(gradleChange).toBeDefined();
            expect(gradleChange?.change).toContain(
              `newArchEnabled=${scenario.targetArchitecture === 'new'}`
            );
          }

          if (platform === 'ios') {
            const podfileChange = configChanges.find((c) =>
              c.file.includes('Podfile')
            );
            expect(podfileChange).toBeDefined();
            expect(podfileChange?.change).toContain(
              `RCT_NEW_ARCH_ENABLED=${
                scenario.targetArchitecture === 'new' ? '1' : '0'
              }`
            );
          }

          if (platform === 'expo') {
            const appJsonChange = configChanges.find((c) =>
              c.file.includes('app.json')
            );
            expect(appJsonChange).toBeDefined();
            expect(appJsonChange?.change).toContain(
              `newArchEnabled=${scenario.targetArchitecture === 'new'}`
            );
          }
        });

        // Verify file system writes were called
        expect(mockFs.writeFileSync).toHaveBeenCalled();

        // Test synchronization
        expect(() => {
          CrossPlatformArchitectureManager.synchronizeArchitectureSettings(
            scenario.targetArchitecture
          );
        }).not.toThrow();

        console.log(`Architecture switching verified for: ${scenario.name}`);
      });
    });

    test('系统应该检测和报告架构不一致性', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 3: 跨平台架构兼容性一致性 - 不一致性检测
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5
       */

      const inconsistencyScenarios = [
        {
          name: 'Android New, iOS Legacy',
          mockFiles: {
            'android/gradle.properties': 'newArchEnabled=true',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "0"',
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
          expectedInconsistencies: ['javascript', 'android', 'ios'],
        },
        {
          name: 'iOS New, Android Legacy',
          mockFiles: {
            'android/gradle.properties': 'newArchEnabled=false',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
          expectedInconsistencies: ['javascript', 'android', 'ios'],
        },
        {
          name: 'Expo Different from Native',
          mockFiles: {
            'android/gradle.properties': 'newArchEnabled=true',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
            'app.json': JSON.stringify({
              expo: {
                plugins: [
                  ['react-native-image-marker', { newArchEnabled: false }],
                ],
              },
            }),
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
          expectedInconsistencies: ['expo'],
        },
      ];

      inconsistencyScenarios.forEach((scenario) => {
        // Reset state
        ArchitectureDetector.reset();
        CrossPlatformArchitectureManager.clearArchitectureCache();

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

        // Test inconsistency detection
        const crossPlatformInfo =
          CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
        expect(crossPlatformInfo.isConsistent).toBe(false);

        const consistencyResult =
          CrossPlatformArchitectureManager.validateArchitectureConsistency();
        expect(consistencyResult.isConsistent).toBe(false);
        expect(consistencyResult.inconsistencies.length).toBeGreaterThan(0);

        // Verify specific inconsistencies are detected
        consistencyResult.inconsistencies.forEach((inconsistency) => {
          expect(inconsistency.platforms.length).toBeGreaterThanOrEqual(2);
          expect(inconsistency.issue).toBeDefined();
          expect(inconsistency.currentState).toBeDefined();

          // Verify platforms mentioned in inconsistency are relevant
          inconsistency.platforms.forEach((platform) => {
            expect(['javascript', 'android', 'ios', 'expo']).toContain(
              platform
            );
          });
        });

        // Should have recommendations for fixing inconsistencies
        expect(consistencyResult.recommendations.length).toBeGreaterThan(0);
        const hasConsistencyRecommendation =
          consistencyResult.recommendations.some(
            (rec) =>
              rec.includes('consistency') ||
              rec.includes('Switch all platforms')
          );
        expect(hasConsistencyRecommendation).toBe(true);

        // Test architecture recommendations
        const recommendations =
          CrossPlatformArchitectureManager.getArchitectureRecommendations();
        const consistencyFix = recommendations.find(
          (r) => r.type === 'consistency_fix'
        );
        expect(consistencyFix).toBeDefined();
        expect(consistencyFix?.priority).toBe('high');

        console.log(`Inconsistency detection verified for: ${scenario.name}`);
      });
    });

    test('系统应该支持版本兼容性检查和架构推荐', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 3: 跨平台架构兼容性一致性 - 版本兼容性和推荐
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5
       */

      const versionCompatibilityScenarios = [
        {
          name: 'React Native 0.73 - Full New Architecture Support',
          version: '0.73.3',
          expectedSupportsNewArch: true,
          expectedRecommendation: 'new',
        },
        {
          name: 'React Native 0.81 - Enhanced New Architecture',
          version: '0.81.0',
          expectedSupportsNewArch: true,
          expectedRecommendation: 'new',
        },
        {
          name: 'React Native 0.68 - Limited New Architecture',
          version: '0.68.5',
          expectedSupportsNewArch: true,
          expectedRecommendation: 'legacy', // Due to limited support
        },
        {
          name: 'React Native 0.67 - Legacy Only',
          version: '0.67.5',
          expectedSupportsNewArch: false,
          expectedRecommendation: 'legacy',
        },
      ];

      versionCompatibilityScenarios.forEach((scenario) => {
        // Reset state
        ArchitectureDetector.reset();
        CrossPlatformArchitectureManager.clearArchitectureCache();

        // Setup version-specific mock
        const mockPackageJson = {
          dependencies: { 'react-native': scenario.version },
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

        // Test version compatibility detection
        const crossPlatformInfo =
          CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
        expect(crossPlatformInfo).toBeDefined();
        expect(crossPlatformInfo.javascript.version).toBe(scenario.version);

        // Test architecture recommendations
        const recommendations =
          CrossPlatformArchitectureManager.getArchitectureRecommendations();
        expect(Array.isArray(recommendations)).toBe(true);

        if (
          !scenario.expectedSupportsNewArch &&
          crossPlatformInfo.recommendedArchitecture === 'new'
        ) {
          // Should recommend version upgrade for unsupported versions
          const versionUpgrade = recommendations.find(
            (r) => r.type === 'version_upgrade'
          );
          expect(versionUpgrade).toBeDefined();
          expect(versionUpgrade?.priority).toBe('high');
        }

        if (
          scenario.expectedSupportsNewArch &&
          crossPlatformInfo.recommendedArchitecture === 'legacy'
        ) {
          // Should suggest performance improvement for supported versions
          const performanceImprovement = recommendations.find(
            (r) => r.type === 'performance_improvement'
          );
          expect(performanceImprovement).toBeDefined();
        }

        // Test architecture switching capability
        const canSwitchToNew =
          CrossPlatformArchitectureManager.switchArchitecture('new', []);
        if (scenario.expectedSupportsNewArch) {
          expect(canSwitchToNew?.success).toBe(true);
        } else {
          expect(canSwitchToNew?.success).toBe(false);
          expect(canSwitchToNew?.errors.length).toBeGreaterThan(0);
        }

        // Legacy should always be supported
        const canSwitchToLegacy =
          CrossPlatformArchitectureManager.switchArchitecture('legacy', []);
        expect(canSwitchToLegacy?.success).toBe(true);

        console.log(`Version compatibility verified for: ${scenario.name}`);
      });
    });

    test('系统应该处理平台特定的架构配置差异', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 3: 跨平台架构兼容性一致性 - 平台特定配置
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5
       */

      const platformSpecificScenarios = [
        {
          name: 'Android Only Project',
          mockFiles: {
            'android/gradle.properties': 'newArchEnabled=true',
            'android/build.gradle': 'apply plugin: "com.android.application"',
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
          expectedPlatforms: ['android'],
        },
        {
          name: 'iOS Only Project',
          mockFiles: {
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
            'ios/Podfile.lock': 'PODS:',
            'package.json': JSON.stringify({
              dependencies: { 'react-native': '0.73.3' },
            }),
          },
          expectedPlatforms: ['ios'],
        },
        {
          name: 'Expo Only Project',
          mockFiles: {
            'app.json': JSON.stringify({
              expo: {
                plugins: [
                  ['react-native-image-marker', { newArchEnabled: true }],
                ],
              },
            }),
            'package.json': JSON.stringify({
              dependencies: {
                'react-native': '0.73.3',
                'expo': '^50.0.0',
              },
            }),
          },
          expectedPlatforms: ['expo'],
        },
        {
          name: 'Full Multi-Platform Project',
          mockFiles: {
            'android/gradle.properties': 'newArchEnabled=true',
            'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
            'app.json': JSON.stringify({
              expo: {
                plugins: [
                  ['react-native-image-marker', { newArchEnabled: true }],
                ],
              },
            }),
            'package.json': JSON.stringify({
              dependencies: {
                'react-native': '0.73.3',
                'expo': '^50.0.0',
              },
            }),
          },
          expectedPlatforms: ['android', 'ios', 'expo'],
        },
      ];

      platformSpecificScenarios.forEach((scenario) => {
        // Reset state
        ArchitectureDetector.reset();
        CrossPlatformArchitectureManager.clearArchitectureCache();

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

        // Test platform detection
        const crossPlatformInfo =
          CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
        expect(crossPlatformInfo).toBeDefined();

        // Verify platform-specific configuration detection
        const platformInfos = [
          { name: 'android', info: crossPlatformInfo.android },
          { name: 'ios', info: crossPlatformInfo.ios },
          { name: 'expo', info: crossPlatformInfo.expo },
        ];

        platformInfos.forEach(({ name, info }) => {
          if (scenario.expectedPlatforms.includes(name)) {
            // Platform should be configured
            expect(info.configurationSource).not.toBe('not_configured');

            // Should have valid configuration
            expect(typeof info.isNewArchitecture).toBe('boolean');
            expect(typeof info.hasTurboModules).toBe('boolean');
            expect(typeof info.hasJSI).toBe('boolean');
            expect(typeof info.hasFabric).toBe('boolean');
          } else {
            // Platform should not be configured or have default values
            expect(info.configurationSource).toBe('not_configured');
          }
        });

        // Test platform-specific switching
        scenario.expectedPlatforms.forEach((platform) => {
          const switchResult =
            CrossPlatformArchitectureManager.switchArchitecture('legacy', [
              platform as Platform,
            ]);

          expect(switchResult).toBeDefined();
          expect(switchResult.success).toBe(true);

          const platformResult =
            switchResult.platformResults[platform as Platform];
          expect(platformResult).toBeDefined();
          expect(platformResult.success).toBe(true);
        });

        // Test configuration synchronization
        expect(() => {
          CrossPlatformArchitectureManager.synchronizeArchitectureSettings(
            'new'
          );
        }).not.toThrow();

        console.log(
          `Platform-specific configuration verified for: ${scenario.name}`
        );
      });
    });

    test('系统应该提供架构状态缓存和重置功能', () => {
      /**
       * Feature: android-ci-build-fix
       * Property 3: 跨平台架构兼容性一致性 - 缓存和状态管理
       * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.4, 6.5
       */

      // Setup consistent mock files
      const mockFiles = {
        'android/gradle.properties': 'newArchEnabled=true',
        'ios/Podfile': 'ENV["RCT_NEW_ARCH_ENABLED"] = "1"',
        'package.json': JSON.stringify({
          dependencies: { 'react-native': '0.73.3' },
        }),
      };

      mockFs.existsSync.mockImplementation((filePath: any) => {
        const relativePath = path.relative(process.cwd(), filePath.toString());
        return Object.keys(mockFiles).some(
          (mockPath) =>
            relativePath.includes(mockPath) ||
            filePath.toString().includes(mockPath)
        );
      });

      mockFs.readFileSync.mockImplementation((filePath: any) => {
        const relativePath = path.relative(process.cwd(), filePath.toString());
        for (const [mockPath, content] of Object.entries(mockFiles)) {
          if (
            relativePath.includes(mockPath) ||
            filePath.toString().includes(mockPath)
          ) {
            return content;
          }
        }
        return '{}';
      });

      // Test initial detection and caching
      const info1 =
        CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
      expect(info1).toBeDefined();

      // Clear file system call count
      mockFs.readFileSync.mockClear();

      // Second call should use cache
      const info2 =
        CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
      expect(info2).toBe(info1); // Should be the same object (cached)
      expect(mockFs.readFileSync).not.toHaveBeenCalled();

      // Test cached platform info retrieval
      const androidInfo1 =
        CrossPlatformArchitectureManager.getCachedArchitectureInfo('android');
      const androidInfo2 =
        CrossPlatformArchitectureManager.getCachedArchitectureInfo('android');
      expect(androidInfo1).toBeDefined();
      expect(androidInfo2).toBe(androidInfo1);

      // Test synced state tracking
      expect(
        CrossPlatformArchitectureManager.getSyncedArchitectureState()
      ).toBeNull();

      // Perform architecture switch to set synced state
      const switchResult = CrossPlatformArchitectureManager.switchArchitecture(
        'new',
        ['android']
      );
      expect(switchResult.success).toBe(true);

      expect(
        CrossPlatformArchitectureManager.getSyncedArchitectureState()
      ).toBe(true);

      // Test cache clearing
      CrossPlatformArchitectureManager.clearArchitectureCache();
      expect(
        CrossPlatformArchitectureManager.getCachedArchitectureInfo('android')
      ).toBeNull();
      expect(
        CrossPlatformArchitectureManager.getSyncedArchitectureState()
      ).toBeNull();

      // After cache clear, should detect again
      const info3 =
        CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
      expect(info3).toBeDefined();
      expect(info3).not.toBe(info1); // Should be a new object
      expect(mockFs.readFileSync).toHaveBeenCalled();

      // Test ArchitectureDetector integration (runtime detection only)
      ArchitectureDetector.reset();
      const detectorInfo1 = ArchitectureDetector.getArchitectureInfo();
      expect(detectorInfo1).toBeDefined();

      // getArchitectureInfo() returns a new object each time (not cached)
      const detectorInfo2 = ArchitectureDetector.getArchitectureInfo();
      expect(detectorInfo2).toStrictEqual(detectorInfo1); // Same content, different object

      console.log('Architecture caching and state management verified');
    });
  });
});
