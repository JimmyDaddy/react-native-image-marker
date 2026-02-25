import { describe, it, expect, beforeEach } from 'vitest';
import { VersionAPIAdapter } from '../VersionAPIAdapter';
import { CrossPlatformVersionDetector } from '../CrossPlatformVersionDetector';

/**
 * Property-Based Tests for Version API Adapter
 * Feature: android-ci-build-fix
 * Property 9: 跨平台版本间 API 适配一致性
 * Validates: Requirements 7.2, 7.4, 7.5
 *
 * This test suite validates that:
 * - Different React Native versions have consistent API interfaces
 * - Version adapters provide unified interfaces for team members
 * - Build results are consistent across different versions
 * - API compatibility is properly validated between versions
 */

describe('Property 9: Cross-Platform Version API Adaptation Consistency', () => {
  beforeEach(() => {
    // Reset adapters before each test
    VersionAPIAdapter.reset();
    CrossPlatformVersionDetector.reset();
  });

  /**
   * Property 9.1: Version Adapter Creation Consistency
   * For any supported React Native version, the system should create a valid adapter
   * with all required interface methods implemented
   */
  it('should create valid adapters for all supported React Native versions', () => {
    const supportedVersions = [
      '0.73.0',
      '0.73.5',
      '0.81.0',
      '0.81.2',
      '0.82.0',
      '0.85.0',
    ];

    supportedVersions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);

      // Verify adapter is created
      expect(adapter).toBeDefined();
      expect(adapter.getVersion()).toBe(version);

      // Verify all required methods are implemented
      expect(typeof adapter.getCodegenConfiguration).toBe('function');
      expect(typeof adapter.getBuildSystemConfiguration).toBe('function');
      expect(typeof adapter.getArchitectureSupport).toBe('function');
      expect(typeof adapter.configureProject).toBe('function');
      expect(typeof adapter.validateConfiguration).toBe('function');
      expect(typeof adapter.getBuildCommands).toBe('function');
      expect(typeof adapter.getDependencyRequirements).toBe('function');

      // Verify configurations are valid
      const codegenConfig = adapter.getCodegenConfiguration();
      expect(codegenConfig).toBeDefined();
      expect(codegenConfig.android).toBeDefined();
      expect(codegenConfig.ios).toBeDefined();

      const buildConfig = adapter.getBuildSystemConfiguration();
      expect(buildConfig).toBeDefined();
      expect(buildConfig.android).toBeDefined();
      expect(buildConfig.ios).toBeDefined();

      const archSupport = adapter.getArchitectureSupport();
      expect(archSupport).toBeDefined();
      expect(typeof archSupport.supportsLegacyArchitecture).toBe('boolean');
      expect(typeof archSupport.supportsNewArchitecture).toBe('boolean');
    });
  });

  /**
   * Property 9.2: Codegen Configuration Location Consistency
   * For any React Native version, the Codegen configuration location should be
   * consistent with the version's requirements (0.73 uses package.json, 0.81+ uses build files)
   */
  it('should provide correct Codegen configuration location based on version', () => {
    const versionTests = [
      {
        version: '0.73.0',
        expectedAndroid: 'package.json',
        expectedIOS: 'package.json',
      },
      {
        version: '0.73.5',
        expectedAndroid: 'package.json',
        expectedIOS: 'package.json',
      },
      {
        version: '0.81.0',
        expectedAndroid: 'build.gradle',
        expectedIOS: 'podspec',
      },
      {
        version: '0.81.2',
        expectedAndroid: 'build.gradle',
        expectedIOS: 'podspec',
      },
      {
        version: '0.82.0',
        expectedAndroid: 'build.gradle',
        expectedIOS: 'podspec',
      },
      {
        version: '0.85.0',
        expectedAndroid: 'build.gradle',
        expectedIOS: 'podspec',
      },
    ];

    versionTests.forEach(({ version, expectedAndroid, expectedIOS }) => {
      const adapter = VersionAPIAdapter.getAdapter(version);
      const codegenConfig = adapter.getCodegenConfiguration();

      expect(codegenConfig.android.location).toBe(expectedAndroid);
      expect(codegenConfig.ios.location).toBe(expectedIOS);

      // Verify other Codegen properties are consistent
      expect(codegenConfig.android.javaPackageName).toBe(
        'com.jimmydaddy.imagemarker'
      );
      expect(codegenConfig.ios.moduleName).toBe('RNImageMarkerSpec');
    });
  });

  /**
   * Property 9.3: Build System Version Progression
   * For any sequence of React Native versions in ascending order, the build system
   * versions (Gradle, Kotlin, Xcode, Swift) should be monotonically non-decreasing
   */
  it('should have non-decreasing build system versions across React Native versions', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];
    const adapters = versions.map((v) => VersionAPIAdapter.getAdapter(v));

    for (let i = 1; i < adapters.length; i++) {
      const prevConfig = adapters[i - 1]!.getBuildSystemConfiguration();
      const currConfig = adapters[i]!.getBuildSystemConfiguration();

      // Android versions should not decrease
      const prevGradleMajor = parseInt(
        prevConfig.android.gradlePluginVersion.split('.')[0] || '0',
        10
      );
      const currGradleMajor = parseInt(
        currConfig.android.gradlePluginVersion.split('.')[0] || '0',
        10
      );
      expect(currGradleMajor).toBeGreaterThanOrEqual(prevGradleMajor);

      const prevKotlinMinor = parseFloat(prevConfig.android.kotlinVersion);
      const currKotlinMinor = parseFloat(currConfig.android.kotlinVersion);
      expect(currKotlinMinor).toBeGreaterThanOrEqual(prevKotlinMinor);

      // iOS deployment target should not decrease
      const prevDeployment = parseFloat(prevConfig.ios.deploymentTarget);
      const currDeployment = parseFloat(currConfig.ios.deploymentTarget);
      expect(currDeployment).toBeGreaterThanOrEqual(prevDeployment);

      // Swift version should be valid (note: 5.10 > 5.9 when parsed correctly)
      const prevSwiftParts = prevConfig.ios.swiftVersion.split('.').map(Number);
      const currSwiftParts = currConfig.ios.swiftVersion.split('.').map(Number);

      // Compare major version
      if ((currSwiftParts[0] ?? 0) > (prevSwiftParts[0] ?? 0)) {
        expect(true).toBe(true); // Major version increased
      } else if ((currSwiftParts[0] ?? 0) === (prevSwiftParts[0] ?? 0)) {
        // Same major version, check minor version
        expect(currSwiftParts[1] ?? 0).toBeGreaterThanOrEqual(
          prevSwiftParts[1] ?? 0
        );
      }
    }
  });

  /**
   * Property 9.4: Architecture Support Consistency
   * For any React Native version >= 0.73, both legacy and new architectures should be supported
   * The default architecture should transition from legacy (0.73) to new (0.81+)
   */
  it('should provide consistent architecture support across versions', () => {
    const versionTests = [
      { version: '0.73.0', expectedDefault: 'legacy' },
      { version: '0.73.5', expectedDefault: 'legacy' },
      { version: '0.81.0', expectedDefault: 'new' },
      { version: '0.81.2', expectedDefault: 'new' },
      { version: '0.82.0', expectedDefault: 'new' },
    ];

    versionTests.forEach(({ version, expectedDefault }) => {
      const adapter = VersionAPIAdapter.getAdapter(version);
      const archSupport = adapter.getArchitectureSupport();

      // All versions should support both architectures
      expect(archSupport.supportsLegacyArchitecture).toBe(true);
      expect(archSupport.supportsNewArchitecture).toBe(true);
      expect(archSupport.architectureSwitchingSupported).toBe(true);

      // Default architecture should match expectations
      expect(archSupport.defaultArchitecture).toBe(expectedDefault);
    });
  });

  /**
   * Property 9.5: Build Commands Consistency
   * For any React Native version and platform, build commands should follow
   * consistent patterns and include all required commands
   */
  it('should provide consistent build commands across versions and platforms', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];
    const platforms: ('android' | 'ios')[] = ['android', 'ios'];

    versions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);

      platforms.forEach((platform) => {
        const commands = adapter.getBuildCommands(platform);

        // Verify all required commands are present
        expect(commands.clean).toBeDefined();
        expect(commands.build).toBeDefined();
        expect(commands.buildRelease).toBeDefined();
        expect(commands.run).toBeDefined();

        // Verify commands are non-empty strings
        expect(typeof commands.clean).toBe('string');
        expect(commands.clean.length).toBeGreaterThan(0);
        expect(typeof commands.build).toBe('string');
        expect(commands.build.length).toBeGreaterThan(0);
        expect(typeof commands.buildRelease).toBe('string');
        expect(commands.buildRelease.length).toBeGreaterThan(0);
        expect(typeof commands.run).toBe('string');
        expect(commands.run.length).toBeGreaterThan(0);

        // Verify platform-specific command patterns
        if (platform === 'android') {
          expect(commands.clean).toContain('gradlew');
          expect(commands.build).toContain('assemble');
          expect(commands.run).toContain('run-android');
        } else {
          expect(commands.clean).toContain('xcodebuild');
          expect(commands.build).toContain('xcodebuild');
          expect(commands.run).toContain('run-ios');
        }
      });
    });
  });

  /**
   * Property 9.6: Dependency Requirements Consistency
   * For any React Native version, dependency requirements should be complete
   * and version numbers should be valid
   */
  it('should provide complete and valid dependency requirements', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];

    versions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);
      const deps = adapter.getDependencyRequirements();

      // Verify Node.js requirements
      expect(deps.node).toBeDefined();
      expect(deps.node).toMatch(/>=\d+\.\d+\.\d+/);

      // Verify Android requirements
      expect(deps.android).toBeDefined();
      expect(deps.android.jdk).toBeDefined();
      expect(deps.android.gradle).toBeDefined();
      expect(deps.android.jdk).toMatch(/\d+/);
      expect(deps.android.gradle).toMatch(/\d+\.\d+/);

      // Verify iOS requirements
      expect(deps.ios).toBeDefined();
      expect(deps.ios.cocoapods).toBeDefined();
      expect(deps.ios.xcode).toBeDefined();
      expect(deps.ios.cocoapods).toMatch(/\d+\.\d+\.\d+/);
      expect(deps.ios.xcode).toMatch(/\d+\.\d+/);
    });
  });

  /**
   * Property 9.7: API Compatibility Validation
   * For any two React Native versions, the compatibility validation should
   * correctly identify breaking changes and provide migration steps
   */
  it('should correctly validate API compatibility between versions', () => {
    const compatibilityTests = [
      {
        source: '0.73.0',
        target: '0.73.5',
        expectCompatible: true,
        expectBreakingChanges: 0,
      },
      {
        source: '0.73.0',
        target: '0.81.0',
        expectCompatible: false,
        expectBreakingChanges: 1, // Codegen location change
      },
      {
        source: '0.81.0',
        target: '0.82.0',
        expectCompatible: true,
        expectBreakingChanges: 0,
      },
    ];

    compatibilityTests.forEach(
      ({ source, target, expectCompatible, expectBreakingChanges }) => {
        const result = VersionAPIAdapter.validateAPICompatibility(
          source,
          target
        );

        expect(result).toBeDefined();
        expect(result.isCompatible).toBe(expectCompatible);
        expect(result.breakingChanges.length).toBeGreaterThanOrEqual(
          expectBreakingChanges
        );

        // If not compatible, migration steps should be provided
        if (!expectCompatible) {
          expect(result.migrationSteps.length).toBeGreaterThan(0);
          expect(result.migrationSteps[0]).toContain('Migrating from');
        }

        // Verify result structure
        expect(Array.isArray(result.breakingChanges)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.migrationSteps)).toBe(true);
      }
    );
  });

  /**
   * Property 9.8: Adapter Caching Consistency
   * For any React Native version, requesting the same adapter multiple times
   * should return the same instance (caching behavior)
   */
  it('should cache adapters and return the same instance for the same version', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];

    versions.forEach((version) => {
      const adapter1 = VersionAPIAdapter.getAdapter(version);
      const adapter2 = VersionAPIAdapter.getAdapter(version);
      const adapter3 = VersionAPIAdapter.getAdapter(version);

      // All should be the same instance
      expect(adapter1).toBe(adapter2);
      expect(adapter2).toBe(adapter3);
      expect(adapter1).toBe(adapter3);
    });
  });

  /**
   * Property 9.9: Configuration Validation Consistency
   * For any React Native version and platform, configuration validation
   * should return a consistent result structure
   */
  it('should provide consistent validation results across versions', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];
    const platforms: ('android' | 'ios' | undefined)[] = [
      'android',
      'ios',
      undefined,
    ];

    versions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);

      platforms.forEach((platform) => {
        const result = adapter.validateConfiguration(platform);

        // Verify result structure
        expect(result).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);

        // If invalid, errors should be present
        if (!result.isValid) {
          expect(result.errors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  /**
   * Property 9.10: Unified Interface Consistency
   * For any React Native version, the adapter should provide a unified interface
   * that abstracts version-specific differences, ensuring team members can use
   * the same API regardless of the underlying version
   */
  it('should provide unified interface that abstracts version differences', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];

    // Collect all method signatures from adapters
    const methodSignatures = new Set<string>();

    versions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);

      // Get all method names
      const methods = Object.getOwnPropertyNames(
        Object.getPrototypeOf(adapter)
      );

      methods.forEach((method) => {
        if (
          typeof (adapter as any)[method] === 'function' &&
          method !== 'constructor'
        ) {
          methodSignatures.add(method);
        }
      });
    });

    // Verify all adapters have the same methods
    versions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);

      methodSignatures.forEach((methodName) => {
        expect(typeof (adapter as any)[methodName]).toBe('function');
      });
    });

    // Verify minimum required methods are present
    const requiredMethods = [
      'getVersion',
      'getCodegenConfiguration',
      'getBuildSystemConfiguration',
      'getArchitectureSupport',
      'configureProject',
      'validateConfiguration',
      'getBuildCommands',
      'getDependencyRequirements',
    ];

    requiredMethods.forEach((method) => {
      expect(methodSignatures.has(method)).toBe(true);
    });
  });

  /**
   * Property 9.11: Build Result Consistency
   * For any React Native version, the build configuration should ensure
   * consistent build results across different versions when using the same source code
   */
  it('should ensure consistent build configuration patterns across versions', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];

    versions.forEach((version) => {
      const adapter = VersionAPIAdapter.getAdapter(version);
      const buildConfig = adapter.getBuildSystemConfiguration();

      // Verify Android build configuration consistency
      expect(buildConfig.android.compileSdkVersion).toBeGreaterThanOrEqual(33);
      expect(buildConfig.android.targetSdkVersion).toBeGreaterThanOrEqual(33);
      expect(buildConfig.android.minSdkVersion).toBeGreaterThanOrEqual(21);
      expect(buildConfig.android.compileSdkVersion).toBeGreaterThanOrEqual(
        buildConfig.android.targetSdkVersion
      );
      expect(buildConfig.android.targetSdkVersion).toBeGreaterThanOrEqual(
        buildConfig.android.minSdkVersion
      );

      // Verify iOS build configuration consistency
      const deploymentTarget = parseFloat(buildConfig.ios.deploymentTarget);
      expect(deploymentTarget).toBeGreaterThanOrEqual(13.0);
      expect(deploymentTarget).toBeLessThanOrEqual(18.0);

      const swiftVersion = parseFloat(buildConfig.ios.swiftVersion);
      expect(swiftVersion).toBeGreaterThanOrEqual(5.0);
      expect(swiftVersion).toBeLessThanOrEqual(6.0);
    });
  });

  /**
   * Property 9.12: Version Detection Integration
   * The adapter should integrate seamlessly with CrossPlatformVersionDetector
   * and provide consistent results
   */
  it('should integrate with version detector and provide consistent results', () => {
    const versions = ['0.73.0', '0.81.0', '0.82.0'];

    versions.forEach((version) => {
      // Get adapter using explicit version
      const adapter = VersionAPIAdapter.getAdapter(version);

      // Get configuration strategy from version detector
      const strategy =
        CrossPlatformVersionDetector.getConfigurationStrategy(version);

      // Compare configurations
      const adapterBuildConfig = adapter.getBuildSystemConfiguration();
      const strategyAndroidConfig = strategy.getAndroidConfig();
      const strategyIOSConfig = strategy.getIOSConfig();

      // Verify Android configuration consistency
      expect(adapterBuildConfig.android.gradlePluginVersion).toBe(
        strategyAndroidConfig.gradleConfig.pluginVersion
      );
      expect(adapterBuildConfig.android.kotlinVersion).toBe(
        strategyAndroidConfig.gradleConfig.kotlinVersion
      );

      // Verify iOS configuration consistency
      expect(adapterBuildConfig.ios.deploymentTarget).toBe(
        strategyIOSConfig.buildConfig.deploymentTarget
      );
      expect(adapterBuildConfig.ios.swiftVersion).toBe(
        strategyIOSConfig.buildConfig.swiftVersion
      );
    });
  });
});
