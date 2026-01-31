import * as fs from 'fs';
import * as path from 'path';
import { CrossPlatformVersionDetector } from './CrossPlatformVersionDetector';

/**
 * Codegen Code Generation Validation Manager
 * Validates generated Android Java/Kotlin and iOS Swift/Objective-C code syntax correctness
 * Ensures generated interfaces match TypeScript definitions
 */
export class CodegenValidationManager {
  private static readonly ANDROID_GENERATED_PATH =
    'android/build/generated/source/codegen';
  private static readonly IOS_GENERATED_PATH = 'ios/build/generated/ios';
  private static readonly SPEC_FILE_PATH = 'specs/NativeImageMarker.ts';

  /**
   * Validates generated Android Java/Kotlin code syntax correctness
   * @param version React Native version (optional, will detect if not provided)
   * @returns Android code validation result
   */
  static validateAndroidGeneratedCode(
    version?: string
  ): AndroidCodeValidationResult {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();
    const result: AndroidCodeValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      generatedFiles: [],
      syntaxValidation: {
        javaFiles: [],
        kotlinFiles: [],
      },
      interfaceMatching: {
        matchesTypeScript: false,
        missingMethods: [],
        extraMethods: [],
        typeDiscrepancies: [],
      },
    };

    try {
      // Check if generated directory exists
      const generatedPath = path.join(
        process.cwd(),
        this.ANDROID_GENERATED_PATH
      );
      if (!fs.existsSync(generatedPath)) {
        result.warnings.push(
          'Android generated code directory not found - Codegen may not have run'
        );
        return result;
      }

      // Find generated files
      const generatedFiles = this.findGeneratedFiles(generatedPath, [
        '.java',
        '.kt',
      ]);
      result.generatedFiles = generatedFiles;

      if (generatedFiles.length === 0) {
        result.warnings.push('No generated Android files found');
        return result;
      }

      // Validate each generated file
      for (const filePath of generatedFiles) {
        const fileExtension = path.extname(filePath);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        if (fileExtension === '.java') {
          const javaValidation = this.validateJavaFile(
            filePath,
            fileContent,
            targetVersion
          );
          result.syntaxValidation.javaFiles.push(javaValidation);

          if (!javaValidation.isValid) {
            result.isValid = false;
            result.errors.push(...javaValidation.errors);
          }
          result.warnings.push(...javaValidation.warnings);
        } else if (fileExtension === '.kt') {
          const kotlinValidation = this.validateKotlinFile(
            filePath,
            fileContent,
            targetVersion
          );
          result.syntaxValidation.kotlinFiles.push(kotlinValidation);

          if (!kotlinValidation.isValid) {
            result.isValid = false;
            result.errors.push(...kotlinValidation.errors);
          }
          result.warnings.push(...kotlinValidation.warnings);
        }
      }

      // Validate interface matching with TypeScript definitions
      const interfaceValidation = this.validateAndroidInterfaceMatching(
        generatedFiles,
        targetVersion
      );
      result.interfaceMatching = interfaceValidation;

      if (!interfaceValidation.matchesTypeScript) {
        result.isValid = false;
        result.errors.push(
          'Generated Android interfaces do not match TypeScript definitions'
        );
      }
    } catch (error) {
      result.errors.push(`Failed to validate Android generated code: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates generated iOS Swift/Objective-C code syntax correctness
   * @param version React Native version (optional, will detect if not provided)
   * @returns iOS code validation result
   */
  static validateIOSGeneratedCode(version?: string): IOSCodeValidationResult {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();
    const result: IOSCodeValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      generatedFiles: [],
      syntaxValidation: {
        swiftFiles: [],
        objcFiles: [],
      },
      interfaceMatching: {
        matchesTypeScript: false,
        missingMethods: [],
        extraMethods: [],
        typeDiscrepancies: [],
      },
    };

    try {
      // Check if generated directory exists
      const generatedPath = path.join(process.cwd(), this.IOS_GENERATED_PATH);
      if (!fs.existsSync(generatedPath)) {
        result.warnings.push(
          'iOS generated code directory not found - Codegen may not have run'
        );
        return result;
      }

      // Find generated files
      const generatedFiles = this.findGeneratedFiles(generatedPath, [
        '.swift',
        '.h',
        '.m',
        '.mm',
      ]);
      result.generatedFiles = generatedFiles;

      if (generatedFiles.length === 0) {
        result.warnings.push('No generated iOS files found');
        return result;
      }

      // Validate each generated file
      for (const filePath of generatedFiles) {
        const fileExtension = path.extname(filePath);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        if (fileExtension === '.swift') {
          const swiftValidation = this.validateSwiftFile(
            filePath,
            fileContent,
            targetVersion
          );
          result.syntaxValidation.swiftFiles.push(swiftValidation);

          if (!swiftValidation.isValid) {
            result.isValid = false;
            result.errors.push(...swiftValidation.errors);
          }
          result.warnings.push(...swiftValidation.warnings);
        } else if (['.h', '.m', '.mm'].includes(fileExtension)) {
          const objcValidation = this.validateObjectiveCFile(
            filePath,
            fileContent,
            targetVersion
          );
          result.syntaxValidation.objcFiles.push(objcValidation);

          if (!objcValidation.isValid) {
            result.isValid = false;
            result.errors.push(...objcValidation.errors);
          }
          result.warnings.push(...objcValidation.warnings);
        }
      }

      // Validate interface matching with TypeScript definitions
      const interfaceValidation = this.validateIOSInterfaceMatching(
        generatedFiles,
        targetVersion
      );
      result.interfaceMatching = interfaceValidation;

      if (!interfaceValidation.matchesTypeScript) {
        result.isValid = false;
        result.errors.push(
          'Generated iOS interfaces do not match TypeScript definitions'
        );
      }
    } catch (error) {
      result.errors.push(`Failed to validate iOS generated code: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Ensures generated interfaces match TypeScript definitions
   * @param platform Target platform ('android' | 'ios' | 'both')
   * @param version React Native version (optional, will detect if not provided)
   * @returns Interface matching validation result
   */
  static validateInterfaceMatching(
    platform: 'android' | 'ios' | 'both' = 'both',
    version?: string
  ): InterfaceMatchingResult {
    const targetVersion =
      version || CrossPlatformVersionDetector.detectReactNativeVersion();
    const result: InterfaceMatchingResult = {
      isValid: true,
      errors: [],
      warnings: [],
      typeScriptDefinitions: null,
      platformResults: {},
    };

    try {
      // Parse TypeScript definitions
      const tsDefinitions = this.parseTypeScriptDefinitions();
      result.typeScriptDefinitions = tsDefinitions;

      if (platform === 'android' || platform === 'both') {
        const androidValidation =
          this.validateAndroidGeneratedCode(targetVersion);
        result.platformResults.android = androidValidation.interfaceMatching;

        if (!androidValidation.interfaceMatching.matchesTypeScript) {
          result.isValid = false;
          result.errors.push(
            'Android generated interfaces do not match TypeScript definitions'
          );
        }
      }

      if (platform === 'ios' || platform === 'both') {
        const iosValidation = this.validateIOSGeneratedCode(targetVersion);
        result.platformResults.ios = iosValidation.interfaceMatching;

        if (!iosValidation.interfaceMatching.matchesTypeScript) {
          result.isValid = false;
          result.errors.push(
            'iOS generated interfaces do not match TypeScript definitions'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate interface matching: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Finds generated files in the specified directory
   * @param directory Directory to search
   * @param extensions File extensions to look for
   * @returns Array of file paths
   */
  private static findGeneratedFiles(
    directory: string,
    extensions: string[]
  ): string[] {
    const files: string[] = [];

    if (!fs.existsSync(directory)) {
      return files;
    }

    const searchDirectory = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          searchDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    searchDirectory(directory);
    return files;
  }

  /**
   * Validates Java file syntax
   * @param filePath Path to the Java file
   * @param content File content
   * @param version React Native version
   * @returns Java file validation result
   */
  private static validateJavaFile(
    filePath: string,
    content: string,
    version: string
  ): JavaFileValidationResult {
    const result: JavaFileValidationResult = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      hasRequiredImports: false,
      hasCorrectPackage: false,
      hasRequiredMethods: false,
    };

    try {
      // Check package declaration
      const packageMatch = content.match(/package\s+([a-zA-Z0-9_.]+);/);
      if (packageMatch) {
        result.hasCorrectPackage =
          packageMatch[1]?.includes('com.jimmydaddy.imagemarker') ?? false;
        if (!result.hasCorrectPackage) {
          result.warnings.push(
            `Package name may be incorrect: ${packageMatch[1]}`
          );
        }
      } else {
        result.errors.push('Missing package declaration');
        result.isValid = false;
      }

      // Check required imports
      const requiredImports = [
        'com.facebook.react.bridge',
        'com.facebook.react.turbomodule',
      ];

      let hasRequiredImports = false;
      for (const requiredImport of requiredImports) {
        if (content.includes(requiredImport)) {
          hasRequiredImports = true;
          break;
        }
      }
      result.hasRequiredImports = hasRequiredImports;

      if (!hasRequiredImports) {
        result.warnings.push('Missing some expected React Native imports');
      }

      // Check for required methods
      const requiredMethods = ['markWithText', 'markWithImage'];
      let foundMethods = 0;

      for (const method of requiredMethods) {
        if (content.includes(method)) {
          foundMethods++;
        }
      }

      result.hasRequiredMethods = foundMethods === requiredMethods.length;
      if (!result.hasRequiredMethods) {
        result.warnings.push(
          `Missing some required methods. Found ${foundMethods}/${requiredMethods.length}`
        );
      }

      // Check for basic Java syntax issues
      const syntaxChecks = [
        { pattern: /class\s+\w+/, message: 'Missing class declaration' },
        { pattern: /\{[\s\S]*\}/, message: 'Missing class body braces' },
        { pattern: /;/, message: 'Missing semicolons' },
      ];

      for (const check of syntaxChecks) {
        if (!check.pattern.test(content)) {
          result.errors.push(check.message);
          result.isValid = false;
        }
      }

      // Version-specific checks
      if (this.isVersion073OrLater(version)) {
        if (
          !content.includes('TurboModule') &&
          !content.includes('ReactMethod')
        ) {
          result.warnings.push(
            'Expected TurboModule or ReactMethod annotations for React Native 0.73+'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate Java file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates Kotlin file syntax
   * @param filePath Path to the Kotlin file
   * @param content File content
   * @param version React Native version
   * @returns Kotlin file validation result
   */
  private static validateKotlinFile(
    filePath: string,
    content: string,
    version: string
  ): KotlinFileValidationResult {
    const result: KotlinFileValidationResult = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      hasRequiredImports: false,
      hasCorrectPackage: false,
      hasRequiredMethods: false,
    };

    try {
      // Check package declaration
      const packageMatch = content.match(/package\s+([a-zA-Z0-9_.]+)/);
      if (packageMatch) {
        result.hasCorrectPackage =
          packageMatch[1]?.includes('com.jimmydaddy.imagemarker') ?? false;
        if (!result.hasCorrectPackage) {
          result.warnings.push(
            `Package name may be incorrect: ${packageMatch[1]}`
          );
        }
      } else {
        result.errors.push('Missing package declaration');
        result.isValid = false;
      }

      // Check required imports
      const requiredImports = [
        'com.facebook.react.bridge',
        'com.facebook.react.turbomodule',
      ];

      let hasRequiredImports = false;
      for (const requiredImport of requiredImports) {
        if (content.includes(requiredImport)) {
          hasRequiredImports = true;
          break;
        }
      }
      result.hasRequiredImports = hasRequiredImports;

      if (!hasRequiredImports) {
        result.warnings.push('Missing some expected React Native imports');
      }

      // Check for required methods
      const requiredMethods = ['markWithText', 'markWithImage'];
      let foundMethods = 0;

      for (const method of requiredMethods) {
        if (content.includes(method)) {
          foundMethods++;
        }
      }

      result.hasRequiredMethods = foundMethods === requiredMethods.length;
      if (!result.hasRequiredMethods) {
        result.warnings.push(
          `Missing some required methods. Found ${foundMethods}/${requiredMethods.length}`
        );
      }

      // Check for basic Kotlin syntax
      const syntaxChecks = [
        {
          pattern: /(class|object|interface)\s+\w+/,
          message: 'Missing class/object/interface declaration',
        },
        { pattern: /\{[\s\S]*\}/, message: 'Missing body braces' },
        { pattern: /(fun|val|var)/, message: 'Missing Kotlin keywords' },
      ];

      for (const check of syntaxChecks) {
        if (!check.pattern.test(content)) {
          result.errors.push(check.message);
          result.isValid = false;
        }
      }

      // Version-specific checks
      if (this.isVersion073OrLater(version)) {
        if (
          !content.includes('TurboModule') &&
          !content.includes('ReactMethod')
        ) {
          result.warnings.push(
            'Expected TurboModule or ReactMethod annotations for React Native 0.73+'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate Kotlin file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates Swift file syntax
   * @param filePath Path to the Swift file
   * @param content File content
   * @param version React Native version
   * @returns Swift file validation result
   */
  private static validateSwiftFile(
    filePath: string,
    content: string,
    version: string
  ): SwiftFileValidationResult {
    const result: SwiftFileValidationResult = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      hasRequiredImports: false,
      hasCorrectModule: false,
      hasRequiredMethods: false,
    };

    try {
      // Check required imports
      const requiredImports = ['React', 'Foundation'];
      let hasRequiredImports = false;

      for (const requiredImport of requiredImports) {
        if (content.includes(`import ${requiredImport}`)) {
          hasRequiredImports = true;
          break;
        }
      }
      result.hasRequiredImports = hasRequiredImports;

      if (!hasRequiredImports) {
        result.warnings.push(
          'Missing some expected imports (React, Foundation)'
        );
      }

      // Check for module/class declaration
      const modulePatterns = [
        /@objc\(.*\)\s*class/,
        /class\s+\w+.*NSObject/,
        /class\s+\w+.*RCTBridgeModule/,
      ];

      let hasCorrectModule = false;
      for (const pattern of modulePatterns) {
        if (pattern.test(content)) {
          hasCorrectModule = true;
          break;
        }
      }
      result.hasCorrectModule = hasCorrectModule;

      if (!hasCorrectModule) {
        result.warnings.push('Missing expected module/class declaration');
      }

      // Check for required methods
      const requiredMethods = ['markWithText', 'markWithImage'];
      let foundMethods = 0;

      for (const method of requiredMethods) {
        if (content.includes(method)) {
          foundMethods++;
        }
      }

      result.hasRequiredMethods = foundMethods === requiredMethods.length;
      if (!result.hasRequiredMethods) {
        result.warnings.push(
          `Missing some required methods. Found ${foundMethods}/${requiredMethods.length}`
        );
      }

      // Check for basic Swift syntax
      const syntaxChecks = [
        {
          pattern: /(class|struct|enum|protocol)/,
          message: 'Missing type declaration',
        },
        { pattern: /\{[\s\S]*\}/, message: 'Missing body braces' },
        { pattern: /(func|var|let)/, message: 'Missing Swift keywords' },
      ];

      for (const check of syntaxChecks) {
        if (!check.pattern.test(content)) {
          result.errors.push(check.message);
          result.isValid = false;
        }
      }

      // Version-specific checks
      if (this.isVersion073OrLater(version)) {
        if (!content.includes('TurboModule') && !content.includes('@objc')) {
          result.warnings.push(
            'Expected TurboModule or @objc annotations for React Native 0.73+'
          );
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate Swift file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates Objective-C file syntax
   * @param filePath Path to the Objective-C file
   * @param content File content
   * @param version React Native version
   * @returns Objective-C file validation result
   */
  private static validateObjectiveCFile(
    filePath: string,
    content: string,
    _version: string
  ): ObjectiveCFileValidationResult {
    const result: ObjectiveCFileValidationResult = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      hasRequiredImports: false,
      hasCorrectInterface: false,
      hasRequiredMethods: false,
    };

    try {
      const isHeaderFile = path.extname(filePath) === '.h';

      // Check required imports
      const requiredImports = [
        'React/RCTBridgeModule.h',
        'Foundation/Foundation.h',
      ];
      let hasRequiredImports = false;

      for (const requiredImport of requiredImports) {
        if (
          content.includes(`#import <${requiredImport}>`) ||
          content.includes(`#import "${requiredImport}"`)
        ) {
          hasRequiredImports = true;
          break;
        }
      }
      result.hasRequiredImports = hasRequiredImports;

      if (!hasRequiredImports) {
        result.warnings.push('Missing some expected imports');
      }

      // Check for interface/implementation
      if (isHeaderFile) {
        const hasInterface = /@interface\s+\w+/.test(content);
        result.hasCorrectInterface = hasInterface;

        if (!hasInterface) {
          result.errors.push('Missing @interface declaration in header file');
          result.isValid = false;
        }
      } else {
        const hasImplementation = /@implementation\s+\w+/.test(content);
        result.hasCorrectInterface = hasImplementation;

        if (!hasImplementation) {
          result.errors.push(
            'Missing @implementation declaration in implementation file'
          );
          result.isValid = false;
        }
      }

      // Check for required methods
      const requiredMethods = ['markWithText', 'markWithImage'];
      let foundMethods = 0;

      for (const method of requiredMethods) {
        if (content.includes(method)) {
          foundMethods++;
        }
      }

      result.hasRequiredMethods = foundMethods === requiredMethods.length;
      if (!result.hasRequiredMethods) {
        result.warnings.push(
          `Missing some required methods. Found ${foundMethods}/${requiredMethods.length}`
        );
      }

      // Check for basic Objective-C syntax
      const syntaxChecks = [
        {
          pattern: /@(interface|implementation|protocol)/,
          message: 'Missing Objective-C declaration',
        },
        { pattern: /@end/, message: 'Missing @end directive' },
      ];

      for (const check of syntaxChecks) {
        if (!check.pattern.test(content)) {
          result.errors.push(check.message);
          result.isValid = false;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to validate Objective-C file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates Android interface matching with TypeScript definitions
   * @param generatedFiles Array of generated file paths
   * @param version React Native version
   * @returns Interface matching result
   */
  private static validateAndroidInterfaceMatching(
    generatedFiles: string[],
    _version: string
  ): InterfaceMatchingValidation {
    const result: InterfaceMatchingValidation = {
      matchesTypeScript: true,
      missingMethods: [],
      extraMethods: [],
      typeDiscrepancies: [],
    };

    try {
      const tsDefinitions = this.parseTypeScriptDefinitions();
      if (!tsDefinitions) {
        result.matchesTypeScript = false;
        result.typeDiscrepancies.push('Could not parse TypeScript definitions');
        return result;
      }

      // Check each generated file for method matching
      for (const filePath of generatedFiles) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for required methods
        for (const method of tsDefinitions.requiredMethods) {
          if (!content.includes(method)) {
            result.missingMethods.push(method);
            result.matchesTypeScript = false;
          }
        }

        // Check for expected types (basic validation)
        for (const type of tsDefinitions.requiredTypes) {
          // In Java/Kotlin, TypeScript types might be mapped differently
          // This is a basic check - more sophisticated mapping would be needed for production
          if (
            type === 'Promise<string>' &&
            !content.includes('Promise') &&
            !content.includes('Callback')
          ) {
            result.typeDiscrepancies.push(
              `Method return type mapping for ${type} not found`
            );
          }
        }
      }
    } catch (error) {
      result.matchesTypeScript = false;
      result.typeDiscrepancies.push(
        `Failed to validate Android interface matching: ${error}`
      );
    }

    return result;
  }

  /**
   * Validates iOS interface matching with TypeScript definitions
   * @param generatedFiles Array of generated file paths
   * @param version React Native version
   * @returns Interface matching result
   */
  private static validateIOSInterfaceMatching(
    generatedFiles: string[],
    _version: string
  ): InterfaceMatchingValidation {
    const result: InterfaceMatchingValidation = {
      matchesTypeScript: true,
      missingMethods: [],
      extraMethods: [],
      typeDiscrepancies: [],
    };

    try {
      const tsDefinitions = this.parseTypeScriptDefinitions();
      if (!tsDefinitions) {
        result.matchesTypeScript = false;
        result.typeDiscrepancies.push('Could not parse TypeScript definitions');
        return result;
      }

      // Check each generated file for method matching
      for (const filePath of generatedFiles) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for required methods
        for (const method of tsDefinitions.requiredMethods) {
          if (!content.includes(method)) {
            result.missingMethods.push(method);
            result.matchesTypeScript = false;
          }
        }

        // Check for expected types (basic validation)
        for (const type of tsDefinitions.requiredTypes) {
          // In Swift/Objective-C, TypeScript types might be mapped differently
          if (
            type === 'Promise<string>' &&
            !content.includes('Promise') &&
            !content.includes('RCTPromise')
          ) {
            result.typeDiscrepancies.push(
              `Method return type mapping for ${type} not found`
            );
          }
        }
      }
    } catch (error) {
      result.matchesTypeScript = false;
      result.typeDiscrepancies.push(
        `Failed to validate iOS interface matching: ${error}`
      );
    }

    return result;
  }

  /**
   * Parses TypeScript definitions from spec file
   * @returns Parsed TypeScript definitions
   */
  private static parseTypeScriptDefinitions(): TypeScriptDefinitions | null {
    try {
      const specPath = path.join(process.cwd(), this.SPEC_FILE_PATH);
      if (!fs.existsSync(specPath)) {
        return null;
      }

      const content = fs.readFileSync(specPath, 'utf8');

      // Extract required methods
      const methodMatches =
        content.match(/(\w+)\([^)]*\):\s*Promise<[^>]+>/g) || [];
      const requiredMethods = methodMatches
        .map((match) => {
          const methodName = match.match(/(\w+)\(/)?.[1];
          return methodName || '';
        })
        .filter((name) => name);

      // Extract required types
      const typeMatches =
        content.match(/export\s+(enum|interface)\s+(\w+)/g) || [];
      const requiredTypes = typeMatches
        .map((match) => {
          const typeName = match.match(
            /export\s+(?:enum|interface)\s+(\w+)/
          )?.[1];
          return typeName || '';
        })
        .filter((name) => name);

      // Add Promise<string> as a required type for return values
      requiredTypes.push('Promise<string>');

      return {
        requiredMethods,
        requiredTypes,
        enums: typeMatches
          .filter((match) => match.includes('enum'))
          .map((match) => match.match(/export\s+enum\s+(\w+)/)?.[1] || '')
          .filter((name) => name),
        interfaces: typeMatches
          .filter((match) => match.includes('interface'))
          .map((match) => match.match(/export\s+interface\s+(\w+)/)?.[1] || '')
          .filter((name) => name),
      };
    } catch (error) {
      console.warn('Failed to parse TypeScript definitions:', error);
      return null;
    }
  }

  /**
   * Checks if version is 0.73 or later
   * @param version React Native version
   * @returns True if version is 0.73 or later
   */
  private static isVersion073OrLater(version: string): boolean {
    const versionMatch = version.match(/^(\d+)\.(\d+)/);
    if (!versionMatch) return false;

    const major = parseInt(versionMatch[1]!, 10);
    const minor = parseInt(versionMatch[2]!, 10);

    return major > 0 || (major === 0 && minor >= 73);
  }
}

// Type definitions
export interface AndroidCodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  generatedFiles: string[];
  syntaxValidation: {
    javaFiles: JavaFileValidationResult[];
    kotlinFiles: KotlinFileValidationResult[];
  };
  interfaceMatching: InterfaceMatchingValidation;
}

export interface IOSCodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  generatedFiles: string[];
  syntaxValidation: {
    swiftFiles: SwiftFileValidationResult[];
    objcFiles: ObjectiveCFileValidationResult[];
  };
  interfaceMatching: InterfaceMatchingValidation;
}

export interface InterfaceMatchingResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  typeScriptDefinitions: TypeScriptDefinitions | null;
  platformResults: {
    android?: InterfaceMatchingValidation;
    ios?: InterfaceMatchingValidation;
  };
}

export interface JavaFileValidationResult {
  filePath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasRequiredImports: boolean;
  hasCorrectPackage: boolean;
  hasRequiredMethods: boolean;
}

export interface KotlinFileValidationResult {
  filePath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasRequiredImports: boolean;
  hasCorrectPackage: boolean;
  hasRequiredMethods: boolean;
}

export interface SwiftFileValidationResult {
  filePath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasRequiredImports: boolean;
  hasCorrectModule: boolean;
  hasRequiredMethods: boolean;
}

export interface ObjectiveCFileValidationResult {
  filePath: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasRequiredImports: boolean;
  hasCorrectInterface: boolean;
  hasRequiredMethods: boolean;
}

export interface InterfaceMatchingValidation {
  matchesTypeScript: boolean;
  missingMethods: string[];
  extraMethods: string[];
  typeDiscrepancies: string[];
}

export interface TypeScriptDefinitions {
  requiredMethods: string[];
  requiredTypes: string[];
  enums: string[];
  interfaces: string[];
}
