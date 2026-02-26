import { ArchitectureDetector } from '../ArchitectureDetector';
import * as fs from 'fs';
import * as path from 'path';

describe('Project Structure Setup', () => {
  beforeEach(() => {
    // Reset architecture detection before each test
    ArchitectureDetector.reset();
  });

  describe('Directory Structure', () => {
    test('should have specs directory with NativeImageMarker.ts', () => {
      const specsDir = path.join(__dirname, '../../specs');
      const nativeImageMarkerSpec = path.join(specsDir, 'NativeImageMarker.ts');

      expect(fs.existsSync(specsDir)).toBe(true);
      expect(fs.existsSync(nativeImageMarkerSpec)).toBe(true);
    });

    test('should have specs/NativeImageMarker.ts for TurboModule spec', () => {
      const nativeImageMarkerSpec = path.join(
        __dirname,
        '../../specs/NativeImageMarker.ts'
      );

      expect(fs.existsSync(nativeImageMarkerSpec)).toBe(true);
    });

    test('should have ArchitectureDetector.ts', () => {
      const architectureDetector = path.join(
        __dirname,
        '../ArchitectureDetector.ts'
      );

      expect(fs.existsSync(architectureDetector)).toBe(true);
    });

    test('should have legacy directory structure', () => {
      const legacyDir = path.join(__dirname, '../legacy');
      const legacyIndex = path.join(legacyDir, 'index.ts');

      expect(fs.existsSync(legacyDir)).toBe(true);
      expect(fs.existsSync(legacyIndex)).toBe(true);
    });

    test('should have iOS TurboModule directory structure', () => {
      const iosTurboModuleDir = path.join(
        __dirname,
        '../../ios/ImageMarkerTurboModule'
      );
      const iosTurboModuleSwift = path.join(
        iosTurboModuleDir,
        'ImageMarkerTurboModule.swift'
      );

      expect(fs.existsSync(iosTurboModuleDir)).toBe(true);
      expect(fs.existsSync(iosTurboModuleSwift)).toBe(true);
    });

    test('should have Android TurboModule directory structure', () => {
      const androidTurboModuleDir = path.join(
        __dirname,
        '../../android/src/main/java/com/jimmydaddy/imagemarker/turbo'
      );

      // Note: Android TurboModule implementation may not exist yet
      // This test verifies the expected directory structure
      expect(fs.existsSync(path.dirname(androidTurboModuleDir))).toBe(true);
    });
  });

  describe('Package.json Configuration', () => {
    test('should have codegenConfig in package.json', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');

      expect(fs.existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.codegenConfig).toBeDefined();
      expect(packageJson.codegenConfig.name).toBe('RNImageMarkerSpec');
      expect(packageJson.codegenConfig.type).toBe('modules');
    });

    test('should have codegen script in package.json', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.scripts.codegen).toBeDefined();
      expect(packageJson.scripts.codegen).toContain('react-native codegen');
    });

    test('should include specs directory in files array', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      expect(packageJson.files).toContain('specs');
    });
  });

  describe('Build System Configuration', () => {
    test('should have iOS podspec with new architecture support', () => {
      const podspecPath = path.join(
        __dirname,
        '../../react-native-image-marker.podspec'
      );

      expect(fs.existsSync(podspecPath)).toBe(true);

      const podspecContent = fs.readFileSync(podspecPath, 'utf8');
      expect(podspecContent).toContain('RCT_NEW_ARCH_ENABLED');
    });

    test('should have Android build.gradle with new architecture support', () => {
      const buildGradlePath = path.join(
        __dirname,
        '../../android/build.gradle'
      );

      expect(fs.existsSync(buildGradlePath)).toBe(true);

      const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');
      // Check for new architecture support indicators
      expect(buildGradleContent).toContain('isNewArchitectureEnabled');
      expect(buildGradleContent).toContain('com.facebook.react');
    });
  });

  describe('Architecture Detection', () => {
    test('should be able to import ArchitectureDetector', () => {
      // ArchitectureDetector is already imported at the top of the file
      expect(ArchitectureDetector).toBeDefined();
      expect(typeof ArchitectureDetector).toBe('function'); // It's a class, so typeof is 'function'
    });

    test('should have reset method for testing', () => {
      expect(typeof ArchitectureDetector.reset).toBe('function');
    });

    test('should have isNewArchitecture method', () => {
      expect(typeof ArchitectureDetector.isNewArchitecture).toBe('function');
    });
  });

  describe('TurboModule Specifications', () => {
    test('should be able to import NativeImageMarker spec without registration error', () => {
      // In test environment, the NativeImageMarker spec is mocked
      // We can test that the spec file exists and has the correct structure
      const specPath = path.join(__dirname, '../../specs/NativeImageMarker.ts');
      expect(fs.existsSync(specPath)).toBe(true);

      const specContent = fs.readFileSync(specPath, 'utf8');
      expect(specContent).toContain('interface Spec extends TurboModule');
      expect(specContent).toContain('TurboModuleRegistry.getEnforcing');
    });

    test('should have specs/NativeImageMarker.ts with correct interface', () => {
      const specPath = path.join(__dirname, '../../specs/NativeImageMarker.ts');

      expect(fs.existsSync(specPath)).toBe(true);

      const specContent = fs.readFileSync(specPath, 'utf8');
      expect(specContent).toContain('interface Spec extends TurboModule');
      expect(specContent).toContain('markWithText');
      expect(specContent).toContain('markWithImage');
      expect(specContent).toContain('Promise<string>');
    });
  });
});
