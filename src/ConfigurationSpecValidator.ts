import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformVersionDetector } from './CrossPlatformVersionDetector';

/**
 * Configuration Specification Validator
 * Validates Codegen parameters and build options conform to official React Native specifications
 * Checks configuration value stability and compatibility
 * Provides configuration recommendations and best practice guidance
 */
export class ConfigurationSpecValidator {
  private static readonly PACKAGE_JSON_PATH = 'package.json';
  private static readonly ANDROID_BUILD_GRADLE_PATH = 'android/build.gradle';
  private static readonly IOS_PODSPEC_PATH =
    'react-native-image-marker.podspec';
  private static readonly ANDROID_GRADLE_PROPERTIES_PATH =
    'android/gradle.properties';

  /**
   * Validates complete configuration specification compliance
   * @param version React Native version (optional, will detect if not provided)
   * @returns Complete validation result with recommendations
   */
  static validateConfigurationSpec(
    version?: string
  ): ConfigurationSpecValidationResult {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();
    const result: ConfigurationSpecValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      validationDetails: {
        codegenParameters: null,
        buildOptions: null,
        stabilityCheck: null,
        compatibilityCheck: null,
      },
    };

    try {
      // Validate Codegen parameters
      const codegenValidation = this.validateCodegenParameters(targetVersion);
      result.validationDetails.codegenParameters = codegenValidation;

      if (!codegenValidation.isValid) {
        result.isValid = false;
        result.errors.push(...codegenValidation.errors);
      }
      result.warnings.push(...codegenValidation.warnings);
      result.recommendations.push(...codegenValidation.recommendations);

      // Validate build options
      const buildOptionsValidation = this.validateBuildOptions(targetVersion);
      result.validationDetails.buildOptions = buildOptionsValidation;

      if (!buildOptionsValidation.isValid) {
        result.isValid = false;
        result.errors.push(...buildOptionsValidation.errors);
      }
      result.warnings.push(...buildOptionsValidation.warnings);
      result.recommendations.push(...buildOptionsValidation.recommendations);

      // Check configuration stability
      const stabilityCheck = this.checkConfigurationStability(targetVersion);
      result.validationDetails.stabilityCheck = stabilityCheck;

      if (!stabilityCheck.isStable) {
        result.warnings.push(...stabilityCheck.issues);
      }
      result.recommendations.push(...stabilityCheck.recommendations);

      // Check configuration compatibility
      const compatibilityCheck =
        this.checkConfigurationCompatibility(targetVersion);
      result.validationDetails.compatibilityCheck = compatibilityCheck;

      if (!compatibilityCheck.isCompatible) {
        result.isValid = false;
        result.errors.push(...compatibilityCheck.errors);
      }
      result.warnings.push(...compatibilityCheck.warnings);
      result.recommendations.push(...compatibilityCheck.recommendations);
    } catch (error) {
      result.errors.push(
        `Failed to validate configuration specification: ${error}`
      );
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates Codegen parameters conform to official React Native specifications
   * @param version React Native version
   * @returns Codegen parameters validation result
   */
  private static validateCodegenParameters(
    version: string
  ): CodegenParametersValidation {
    const result: CodegenParametersValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      parameters: {
        name: null,
        type: null,
        jsSrcsDir: null,
        android: null,
        ios: null,
      },
    };

    try {
      const packageJsonPath = path.join(process.cwd(), this.PACKAGE_JSON_PATH);
      if (!fs.existsSync(packageJsonPath)) {
        result.errors.push('package.json not found');
        result.isValid = false;
        return result;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const codegenConfig = packageJson.codegenConfig;

      if (!codegenConfig) {
        result.errors.push('codegenConfig not found in package.json');
        result.isValid = false;
        result.recommendations.push(
          'Add codegenConfig to package.json following React Native official documentation'
        );
        return result;
      }

      // Validate name parameter
      if (!codegenConfig.name || typeof codegenConfig.name !== 'string') {
        result.errors.push(
          'codegenConfig.name is required and must be a string'
        );
        result.isValid = false;
      } else {
        result.parameters.name = codegenConfig.name;

        // Check naming convention
        if (!/^[A-Z][a-zA-Z0-9]*Spec$/.test(codegenConfig.name)) {
          result.warnings.push(
            `codegenConfig.name should follow naming convention: PascalCaseSpec (e.g., RNImageMarkerSpec)`
          );
          result.recommendations.push(
            `Consider renaming "${codegenConfig.name}" to follow the Spec suffix convention`
          );
        }
      }

      // Validate type parameter
      const validTypes = ['modules', 'components', 'all'];
      if (!codegenConfig.type) {
        result.errors.push('codegenConfig.type is required');
        result.isValid = false;
      } else if (!validTypes.includes(codegenConfig.type)) {
        result.errors.push(
          `codegenConfig.type must be one of: ${validTypes.join(', ')}`
        );
        result.isValid = false;
      } else {
        result.parameters.type = codegenConfig.type;
      }

      // Validate jsSrcsDir parameter
      if (!codegenConfig.jsSrcsDir) {
        result.errors.push('codegenConfig.jsSrcsDir is required');
        result.isValid = false;
      } else {
        result.parameters.jsSrcsDir = codegenConfig.jsSrcsDir;
        const jsSrcsDirPath = path.join(process.cwd(), codegenConfig.jsSrcsDir);
        if (!fs.existsSync(jsSrcsDirPath)) {
          result.errors.push(
            `jsSrcsDir directory does not exist: ${codegenConfig.jsSrcsDir}`
          );
          result.isValid = false;
        }
      }

      // Validate Android configuration
      if (codegenConfig.android) {
        result.parameters.android = codegenConfig.android;

        // Validate javaPackageName
        if (!codegenConfig.android.javaPackageName) {
          result.errors.push('android.javaPackageName is required');
          result.isValid = false;
        } else if (
          !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(
            codegenConfig.android.javaPackageName
          )
        ) {
          result.errors.push(
            'android.javaPackageName must follow Java package naming convention (e.g., com.example.package)'
          );
          result.isValid = false;
        }

        // Validate outputDir
        if (!codegenConfig.android.outputDir) {
          result.warnings.push('android.outputDir is not specified');
          result.recommendations.push(
            'Specify android.outputDir for better control over generated code location'
          );
        } else {
          // Check if outputDir follows recommended pattern
          const recommendedPattern = 'android/build/generated/source/codegen';
          if (!codegenConfig.android.outputDir.includes('generated')) {
            result.recommendations.push(
              `Consider using recommended outputDir pattern: ${recommendedPattern}`
            );
          }
        }
      } else {
        result.warnings.push('android configuration is missing');
        result.recommendations.push(
          'Add android configuration with javaPackageName and outputDir'
        );
      }

      // Validate iOS configuration
      if (codegenConfig.ios) {
        result.parameters.ios = codegenConfig.ios;

        // Validate moduleName
        if (!codegenConfig.ios.moduleName) {
          result.errors.push('ios.moduleName is required');
          result.isValid = false;
        } else if (!/^[A-Z][a-zA-Z0-9]*$/.test(codegenConfig.ios.moduleName)) {
          result.warnings.push(
            'ios.moduleName should follow PascalCase naming convention'
          );
        }

        // Validate outputDir
        if (!codegenConfig.ios.outputDir) {
          result.warnings.push('ios.outputDir is not specified');
          result.recommendations.push(
            'Specify ios.outputDir for better control over generated code location'
          );
        } else {
          // Check if outputDir follows recommended pattern
          const recommendedPattern = 'ios/build/generated/ios';
          if (!codegenConfig.ios.outputDir.includes('generated')) {
            result.recommendations.push(
              `Consider using recommended outputDir pattern: ${recommendedPattern}`
            );
          }
        }
      } else {
        result.warnings.push('ios configuration is missing');
        result.recommendations.push(
          'Add ios configuration with moduleName and outputDir'
        );
      }

      // Version-specific validation
      if (this.isVersion073OrLater(version)) {
        // For RN 0.73+, check if configuration follows new architecture patterns
        if (
          codegenConfig.android &&
          !codegenConfig.android.outputDir?.includes('build/generated')
        ) {
          result.recommendations.push(
            'For React Native 0.73+, use build/generated directory for Codegen output'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate Codegen parameters: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates build options conform to official specifications
   * @param version React Native version
   * @returns Build options validation result
   */
  private static validateBuildOptions(version: string): BuildOptionsValidation {
    const result: BuildOptionsValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      android: null,
      ios: null,
    };

    try {
      // Validate Android build options
      const androidValidation = this.validateAndroidBuildOptions(version);
      result.android = androidValidation;

      if (!androidValidation.isValid) {
        result.isValid = false;
        result.errors.push(...androidValidation.errors);
      }
      result.warnings.push(...androidValidation.warnings);
      result.recommendations.push(...androidValidation.recommendations);

      // Validate iOS build options
      const iosValidation = this.validateIOSBuildOptions(version);
      result.ios = iosValidation;

      if (!iosValidation.isValid) {
        result.isValid = false;
        result.errors.push(...iosValidation.errors);
      }
      result.warnings.push(...iosValidation.warnings);
      result.recommendations.push(...iosValidation.recommendations);
    } catch (error) {
      result.errors.push(`Failed to validate build options: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates Android build options
   * @param version React Native version
   * @returns Android build options validation result
   */
  private static validateAndroidBuildOptions(
    version: string
  ): PlatformBuildOptionsValidation {
    const result: PlatformBuildOptionsValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      options: {},
    };

    try {
      // Check build.gradle
      const buildGradlePath = path.join(
        process.cwd(),
        this.ANDROID_BUILD_GRADLE_PATH
      );
      if (fs.existsSync(buildGradlePath)) {
        const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

        // Check namespace (required for AGP 8.x+)
        if (!buildGradleContent.includes('namespace')) {
          result.warnings.push(
            'Android build.gradle missing namespace declaration (required for Android Gradle Plugin 8.x+)'
          );
          result.recommendations.push(
            'Add namespace declaration: namespace "com.jimmydaddy.imagemarker"'
          );
        }

        // Check Gradle plugin version
        const gradlePluginMatch = buildGradleContent.match(
          /com\.android\.tools\.build:gradle:([0-9.]+)/
        );
        if (gradlePluginMatch) {
          const pluginVersion = gradlePluginMatch[1];
          result.options.gradlePluginVersion = pluginVersion;

          // Validate version compatibility
          const recommendedVersion =
            this.getRecommendedGradlePluginVersion(version);
          if (pluginVersion !== recommendedVersion) {
            result.recommendations.push(
              `Consider using recommended Gradle plugin version ${recommendedVersion} for React Native ${version}`
            );
          }
        }

        // Check Kotlin version
        const kotlinVersionMatch = buildGradleContent.match(
          /org\.jetbrains\.kotlin:kotlin-gradle-plugin:([0-9.]+)/
        );
        if (kotlinVersionMatch) {
          const kotlinVersion = kotlinVersionMatch[1];
          result.options.kotlinVersion = kotlinVersion;

          // Validate Kotlin version compatibility
          const recommendedKotlinVersion =
            this.getRecommendedKotlinVersion(version);
          if (kotlinVersion && kotlinVersion < recommendedKotlinVersion) {
            result.warnings.push(
              `Kotlin version ${kotlinVersion} may be outdated. Recommended: ${recommendedKotlinVersion}+`
            );
          }
        }

        // Check compileSdkVersion
        const compileSdkMatch = buildGradleContent.match(
          /compileSdkVersion\s+(\d+)/
        );
        if (compileSdkMatch) {
          const compileSdk = parseInt(compileSdkMatch[1]!, 10);
          result.options.compileSdkVersion = compileSdk;

          const recommendedSdk = this.getRecommendedCompileSdk(version);
          if (compileSdk < recommendedSdk) {
            result.warnings.push(
              `compileSdkVersion ${compileSdk} is below recommended ${recommendedSdk}`
            );
            result.recommendations.push(
              `Update compileSdkVersion to ${recommendedSdk} for better compatibility`
            );
          }
        }

        // Check for new architecture configuration
        if (this.isVersion073OrLater(version)) {
          if (!buildGradleContent.includes('react {')) {
            result.warnings.push(
              'Missing react {} block for new architecture configuration'
            );
            result.recommendations.push(
              'Add react {} block with codegenConfig for React Native 0.73+'
            );
          }
        }
      } else {
        result.errors.push('Android build.gradle not found');
        result.isValid = false;
      }

      // Check gradle.properties
      const gradlePropertiesPath = path.join(
        process.cwd(),
        this.ANDROID_GRADLE_PROPERTIES_PATH
      );
      if (fs.existsSync(gradlePropertiesPath)) {
        const gradlePropertiesContent = fs.readFileSync(
          gradlePropertiesPath,
          'utf8'
        );

        // Check newArchEnabled property
        if (gradlePropertiesContent.includes('newArchEnabled')) {
          const newArchMatch = gradlePropertiesContent.match(
            /newArchEnabled\s*=\s*(true|false)/
          );
          if (newArchMatch) {
            result.options.newArchEnabled = newArchMatch[1] === 'true';
          }
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate Android build options: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates iOS build options
   * @param version React Native version
   * @returns iOS build options validation result
   */
  private static validateIOSBuildOptions(
    version: string
  ): PlatformBuildOptionsValidation {
    const result: PlatformBuildOptionsValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: [],
      options: {},
    };

    try {
      // Check podspec
      const podspecPath = path.join(process.cwd(), this.IOS_PODSPEC_PATH);
      if (fs.existsSync(podspecPath)) {
        const podspecContent = fs.readFileSync(podspecPath, 'utf8');

        // Check deployment target
        const deploymentTargetMatch = podspecContent.match(
          /s\.platform\s*=\s*:ios,\s*['"]([0-9.]+)['"]/
        );
        if (deploymentTargetMatch) {
          const deploymentTarget = deploymentTargetMatch[1];
          result.options.deploymentTarget = deploymentTarget;

          const recommendedTarget =
            this.getRecommendedIOSDeploymentTarget(version);
          if (deploymentTarget && deploymentTarget < recommendedTarget) {
            result.warnings.push(
              `iOS deployment target ${deploymentTarget} is below recommended ${recommendedTarget}`
            );
            result.recommendations.push(
              `Update iOS deployment target to ${recommendedTarget} for React Native ${version}`
            );
          }
        }

        // Check Swift version
        const swiftVersionMatch = podspecContent.match(
          /s\.swift_version\s*=\s*['"]([0-9.]+)['"]/
        );
        if (swiftVersionMatch) {
          const swiftVersion = swiftVersionMatch[1];
          result.options.swiftVersion = swiftVersion;

          const recommendedSwift = this.getRecommendedSwiftVersion(version);
          if (swiftVersion && swiftVersion < recommendedSwift) {
            result.warnings.push(
              `Swift version ${swiftVersion} may be outdated. Recommended: ${recommendedSwift}+`
            );
          }
        }

        // Check for new architecture support
        if (this.isVersion073OrLater(version)) {
          if (!podspecContent.includes('install_modules_dependencies')) {
            result.warnings.push(
              'Missing install_modules_dependencies for new architecture support'
            );
            result.recommendations.push(
              'Add install_modules_dependencies call for React Native 0.73+ new architecture'
            );
          }

          if (!podspecContent.includes("ENV['RCT_NEW_ARCH_ENABLED']")) {
            result.warnings.push(
              'Missing RCT_NEW_ARCH_ENABLED environment variable check'
            );
            result.recommendations.push(
              'Add conditional new architecture support based on RCT_NEW_ARCH_ENABLED'
            );
          }
        }
      } else {
        result.errors.push('iOS podspec not found');
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(`Failed to validate iOS build options: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Checks configuration value stability
   * @param version React Native version
   * @returns Stability check result
   */
  private static checkConfigurationStability(
    version: string
  ): StabilityCheckResult {
    const result: StabilityCheckResult = {
      isStable: true,
      issues: [],
      recommendations: [],
      stabilityScore: 100,
    };

    try {
      const packageJsonPath = path.join(process.cwd(), this.PACKAGE_JSON_PATH);
      if (!fs.existsSync(packageJsonPath)) {
        result.issues.push('package.json not found');
        result.isStable = false;
        result.stabilityScore -= 50;
        return result;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Check for unstable dependency versions (using ^ or ~ or *)
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      let unstableDependencies = 0;
      for (const [dep, ver] of Object.entries(dependencies)) {
        if (
          typeof ver === 'string' &&
          (ver.startsWith('^') || ver.startsWith('~') || ver.includes('*'))
        ) {
          if (dep.includes('react-native') || dep.includes('react')) {
            unstableDependencies++;
            result.issues.push(
              `Dependency ${dep} uses unstable version specifier: ${ver}`
            );
            result.stabilityScore -= 5;
          }
        }
      }

      if (unstableDependencies > 0) {
        result.isStable = false;
        result.recommendations.push(
          'Consider using exact versions for React Native and React dependencies for better stability'
        );
      }

      // Check for deprecated configuration patterns
      const codegenConfig = packageJson.codegenConfig;
      if (codegenConfig) {
        // Check if using deprecated configuration location for version
        if (this.isVersion073OrLater(version)) {
          // For 0.73+, some configurations should be in platform-specific files
          if (!codegenConfig.android || !codegenConfig.ios) {
            result.issues.push(
              'Missing platform-specific Codegen configuration for React Native 0.73+'
            );
            result.stabilityScore -= 10;
            result.recommendations.push(
              'Add platform-specific android and ios configuration blocks'
            );
          }
        }
      }

      // Ensure stability score doesn't go below 0
      result.stabilityScore = Math.max(0, result.stabilityScore);
    } catch (error) {
      result.issues.push(`Failed to check configuration stability: ${error}`);
      result.isStable = false;
      result.stabilityScore = 0;
    }

    return result;
  }

  /**
   * Checks configuration compatibility across platforms and versions
   * @param version React Native version
   * @returns Compatibility check result
   */
  private static checkConfigurationCompatibility(
    version: string
  ): CompatibilityCheckResult {
    const result: CompatibilityCheckResult = {
      isCompatible: true,
      errors: [],
      warnings: [],
      recommendations: [],
      compatibilityMatrix: {
        android: true,
        ios: true,
        crossPlatform: true,
      },
    };

    try {
      // Check Android compatibility
      const androidCompatibility = this.checkAndroidCompatibility(version);
      result.compatibilityMatrix.android = androidCompatibility.isCompatible;

      if (!androidCompatibility.isCompatible) {
        result.isCompatible = false;
        result.errors.push(...androidCompatibility.errors);
      }
      result.warnings.push(...androidCompatibility.warnings);
      result.recommendations.push(...androidCompatibility.recommendations);

      // Check iOS compatibility
      const iosCompatibility = this.checkIOSCompatibility(version);
      result.compatibilityMatrix.ios = iosCompatibility.isCompatible;

      if (!iosCompatibility.isCompatible) {
        result.isCompatible = false;
        result.errors.push(...iosCompatibility.errors);
      }
      result.warnings.push(...iosCompatibility.warnings);
      result.recommendations.push(...iosCompatibility.recommendations);

      // Check cross-platform compatibility
      const crossPlatformCheck = this.checkCrossPlatformCompatibility(version);
      result.compatibilityMatrix.crossPlatform =
        crossPlatformCheck.isCompatible;

      if (!crossPlatformCheck.isCompatible) {
        result.isCompatible = false;
        result.errors.push(...crossPlatformCheck.errors);
      }
      result.warnings.push(...crossPlatformCheck.warnings);
      result.recommendations.push(...crossPlatformCheck.recommendations);
    } catch (error) {
      result.errors.push(
        `Failed to check configuration compatibility: ${error}`
      );
      result.isCompatible = false;
    }

    return result;
  }

  /**
   * Checks Android-specific compatibility
   * @param version React Native version
   * @returns Android compatibility result
   */
  private static checkAndroidCompatibility(
    _version: string
  ): PlatformCompatibilityResult {
    const result: PlatformCompatibilityResult = {
      isCompatible: true,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    try {
      const buildGradlePath = path.join(
        process.cwd(),
        this.ANDROID_BUILD_GRADLE_PATH
      );
      const gradlePropertiesPath = path.join(
        process.cwd(),
        this.ANDROID_GRADLE_PROPERTIES_PATH
      );

      // Check if files exist
      if (!fs.existsSync(buildGradlePath)) {
        result.errors.push('Android build.gradle not found');
        result.isCompatible = false;
        return result;
      }

      const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

      // Check Gradle and Kotlin version compatibility
      const gradlePluginMatch = buildGradleContent.match(
        /com\.android\.tools\.build:gradle:([0-9.]+)/
      );
      const kotlinVersionMatch = buildGradleContent.match(
        /org\.jetbrains\.kotlin:kotlin-gradle-plugin:([0-9.]+)/
      );

      if (gradlePluginMatch && kotlinVersionMatch) {
        const gradleVersion = gradlePluginMatch[1];
        const kotlinVersion = kotlinVersionMatch[1];

        // Check known incompatibilities
        if (
          gradleVersion &&
          gradleVersion.startsWith('8.') &&
          kotlinVersion &&
          kotlinVersion < '1.8.0'
        ) {
          result.warnings.push(
            `Gradle Plugin ${gradleVersion} may have compatibility issues with Kotlin ${kotlinVersion}. Recommended: Kotlin 1.8.0+`
          );
          result.recommendations.push(
            'Update Kotlin to version 1.8.0 or higher'
          );
        }
      }

      // Check namespace compatibility with AGP version
      if (gradlePluginMatch) {
        const gradleVersion = gradlePluginMatch[1];
        if (
          gradleVersion &&
          gradleVersion.startsWith('8.') &&
          !buildGradleContent.includes('namespace')
        ) {
          result.errors.push(
            'Android Gradle Plugin 8.x requires namespace declaration'
          );
          result.isCompatible = false;
          result.recommendations.push(
            'Add namespace declaration to build.gradle'
          );
        }
      }

      // Check gradle.properties for architecture settings
      if (fs.existsSync(gradlePropertiesPath)) {
        const gradlePropertiesContent = fs.readFileSync(
          gradlePropertiesPath,
          'utf8'
        );

        // Ensure newArchEnabled is explicitly set
        if (!gradlePropertiesContent.includes('newArchEnabled')) {
          result.warnings.push(
            'newArchEnabled property not found in gradle.properties'
          );
          result.recommendations.push(
            'Explicitly set newArchEnabled=true or newArchEnabled=false in gradle.properties'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to check Android compatibility: ${error}`);
      result.isCompatible = false;
    }

    return result;
  }

  /**
   * Checks iOS-specific compatibility
   * @param version React Native version
   * @returns iOS compatibility result
   */
  private static checkIOSCompatibility(
    version: string
  ): PlatformCompatibilityResult {
    const result: PlatformCompatibilityResult = {
      isCompatible: true,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    try {
      const podspecPath = path.join(process.cwd(), this.IOS_PODSPEC_PATH);

      if (!fs.existsSync(podspecPath)) {
        result.errors.push('iOS podspec not found');
        result.isCompatible = false;
        return result;
      }

      const podspecContent = fs.readFileSync(podspecPath, 'utf8');

      // Check deployment target compatibility with React Native version
      const deploymentTargetMatch = podspecContent.match(
        /s\.platform\s*=\s*:ios,\s*['"]([0-9.]+)['"]/
      );
      if (deploymentTargetMatch) {
        const deploymentTarget = deploymentTargetMatch[1];
        const minRequired = this.getMinimumIOSDeploymentTarget(version);

        if (deploymentTarget && deploymentTarget < minRequired) {
          result.errors.push(
            `iOS deployment target ${deploymentTarget} is below minimum required ${minRequired} for React Native ${version}`
          );
          result.isCompatible = false;
          result.recommendations.push(
            `Update iOS deployment target to at least ${minRequired}`
          );
        }
      }

      // Check Swift version compatibility
      const swiftVersionMatch = podspecContent.match(
        /s\.swift_version\s*=\s*['"]([0-9.]+)['"]/
      );
      if (swiftVersionMatch) {
        const swiftVersion = swiftVersionMatch[1];
        const minSwift = this.getMinimumSwiftVersion(version);

        if (swiftVersion && swiftVersion < minSwift) {
          result.warnings.push(
            `Swift version ${swiftVersion} is below recommended ${minSwift} for React Native ${version}`
          );
          result.recommendations.push(
            `Update Swift version to at least ${minSwift}`
          );
        }
      }

      // Check for new architecture compatibility
      if (this.isVersion073OrLater(version)) {
        if (!podspecContent.includes('install_modules_dependencies')) {
          result.warnings.push(
            'Missing new architecture support for React Native 0.73+'
          );
          result.recommendations.push(
            'Add install_modules_dependencies for new architecture support'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to check iOS compatibility: ${error}`);
      result.isCompatible = false;
    }

    return result;
  }

  /**
   * Checks cross-platform configuration compatibility
   * @param version React Native version
   * @returns Cross-platform compatibility result
   */
  private static checkCrossPlatformCompatibility(
    _version: string
  ): PlatformCompatibilityResult {
    const result: PlatformCompatibilityResult = {
      isCompatible: true,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    try {
      const packageJsonPath = path.join(process.cwd(), this.PACKAGE_JSON_PATH);
      if (!fs.existsSync(packageJsonPath)) {
        result.errors.push('package.json not found');
        result.isCompatible = false;
        return result;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const codegenConfig = packageJson.codegenConfig;

      if (!codegenConfig) {
        result.errors.push('codegenConfig not found in package.json');
        result.isCompatible = false;
        return result;
      }

      // Check if Android and iOS configurations are consistent
      if (codegenConfig.android && codegenConfig.ios) {
        // Check if both platforms use consistent naming
        const androidName = codegenConfig.android.javaPackageName;
        const iosName = codegenConfig.ios.moduleName;

        if (androidName && iosName) {
          // Extract base name from Java package (e.g., com.jimmydaddy.imagemarker -> imagemarker)
          const androidBaseName = androidName.split('.').pop();
          const iosBaseName = iosName.replace(/Spec$/, '').toLowerCase();

          if (androidBaseName && !iosBaseName.includes(androidBaseName)) {
            result.warnings.push(
              'Android and iOS module names may not be consistent'
            );
            result.recommendations.push(
              'Consider using consistent naming across platforms for better maintainability'
            );
          }
        }

        // Check if output directories follow similar patterns
        const androidOutput = codegenConfig.android.outputDir;
        const iosOutput = codegenConfig.ios.outputDir;

        if (androidOutput && iosOutput) {
          const androidHasGenerated = androidOutput.includes('generated');
          const iosHasGenerated = iosOutput.includes('generated');

          if (androidHasGenerated !== iosHasGenerated) {
            result.warnings.push(
              'Android and iOS output directories use different patterns'
            );
            result.recommendations.push(
              'Use consistent directory patterns across platforms (e.g., both using "generated" directory)'
            );
          }
        }
      } else {
        result.warnings.push(
          'Missing platform-specific configuration for Android or iOS'
        );
        result.recommendations.push(
          'Add both android and ios configuration blocks for complete cross-platform support'
        );
      }
    } catch (error) {
      result.errors.push(
        `Failed to check cross-platform compatibility: ${error}`
      );
      result.isCompatible = false;
    }

    return result;
  }

  // Helper methods for version-specific recommendations

  private static getRecommendedGradlePluginVersion(version: string): string {
    if (this.isVersion081OrLater(version)) {
      return '8.3.0';
    } else if (this.isVersion073OrLater(version)) {
      return '8.1.1';
    }
    return '7.4.2';
  }

  private static getRecommendedKotlinVersion(version: string): string {
    if (this.isVersion081OrLater(version)) {
      return '1.9.0';
    } else if (this.isVersion073OrLater(version)) {
      return '1.8.0';
    }
    return '1.7.0';
  }

  private static getRecommendedCompileSdk(version: string): number {
    if (this.isVersion081OrLater(version)) {
      return 34;
    } else if (this.isVersion073OrLater(version)) {
      return 33;
    }
    return 31;
  }

  private static getRecommendedIOSDeploymentTarget(version: string): string {
    if (this.isVersion081OrLater(version)) {
      return '13.4';
    } else if (this.isVersion073OrLater(version)) {
      return '13.0';
    }
    return '12.4';
  }

  private static getMinimumIOSDeploymentTarget(version: string): string {
    if (this.isVersion081OrLater(version)) {
      return '13.0';
    } else if (this.isVersion073OrLater(version)) {
      return '12.4';
    }
    return '11.0';
  }

  private static getRecommendedSwiftVersion(_version: string): string {
    return '5.0';
  }

  private static getMinimumSwiftVersion(_version: string): string {
    return '5.0';
  }

  private static isVersion073OrLater(version: string): boolean {
    const versionMatch = version.match(/^(\d+)\.(\d+)/);
    if (!versionMatch) return false;

    const major = parseInt(versionMatch[1]!, 10);
    const minor = parseInt(versionMatch[2]!, 10);

    return major > 0 || (major === 0 && minor >= 73);
  }

  private static isVersion081OrLater(version: string): boolean {
    const versionMatch = version.match(/^(\d+)\.(\d+)/);
    if (!versionMatch) return false;

    const major = parseInt(versionMatch[1]!, 10);
    const minor = parseInt(versionMatch[2]!, 10);

    return major > 0 || (major === 0 && minor >= 81);
  }
}

// Type definitions

export interface ConfigurationSpecValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  validationDetails: {
    codegenParameters: CodegenParametersValidation | null;
    buildOptions: BuildOptionsValidation | null;
    stabilityCheck: StabilityCheckResult | null;
    compatibilityCheck: CompatibilityCheckResult | null;
  };
}

export interface CodegenParametersValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  parameters: {
    name: string | null;
    type: string | null;
    jsSrcsDir: string | null;
    android: any | null;
    ios: any | null;
  };
}

export interface BuildOptionsValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  android: PlatformBuildOptionsValidation | null;
  ios: PlatformBuildOptionsValidation | null;
}

export interface PlatformBuildOptionsValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  options: Record<string, any>;
}

export interface StabilityCheckResult {
  isStable: boolean;
  issues: string[];
  recommendations: string[];
  stabilityScore: number;
}

export interface CompatibilityCheckResult {
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  compatibilityMatrix: {
    android: boolean;
    ios: boolean;
    crossPlatform: boolean;
  };
}

export interface PlatformCompatibilityResult {
  isCompatible: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}
