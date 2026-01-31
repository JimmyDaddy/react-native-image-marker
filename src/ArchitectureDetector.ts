import { TurboModuleRegistry, UIManager } from 'react-native';

/**
 * Architecture detector for React Native new architecture support
 * Detects whether TurboModules, JSI, and Fabric are available at runtime
 * Extended with cross-platform architecture detection and switching capabilities
 */
export class ArchitectureDetector {
  private static _isNewArchitecture: boolean | null = null;
  private static _hasTurboModules: boolean | null = null;
  private static _hasJSI: boolean | null = null;
  private static _hasFabric: boolean | null = null;

  /**
   * Detects if the current React Native environment supports new architecture
   * @returns true if new architecture is available, false otherwise
   */
  static isNewArchitecture(): boolean {
    if (this._isNewArchitecture === null) {
      this._isNewArchitecture = this.detectArchitecture();
    }
    return this._isNewArchitecture;
  }

  /**
   * Checks if TurboModules are available
   * @returns true if TurboModules are supported
   */
  static hasTurboModules(): boolean {
    if (this._hasTurboModules === null) {
      this._hasTurboModules = this.detectTurboModules();
    }
    return this._hasTurboModules;
  }

  /**
   * Checks if JSI (JavaScript Interface) is available
   * @returns true if JSI is enabled
   */
  static hasJSI(): boolean {
    if (this._hasJSI === null) {
      this._hasJSI = this.detectJSI();
    }
    return this._hasJSI;
  }

  /**
   * Checks if Fabric renderer is available
   * @returns true if Fabric is enabled
   */
  static hasFabric(): boolean {
    if (this._hasFabric === null) {
      this._hasFabric = this.detectFabric();
    }
    return this._hasFabric;
  }

  /**
   * Internal method to detect architecture features
   * @returns true if new architecture features are detected
   */
  private static detectArchitecture(): boolean {
    // New architecture requires both TurboModules and JSI
    // Fabric is optional but preferred
    return this.hasTurboModules() && this.hasJSI();
  }

  /**
   * Detects TurboModule availability
   * @returns true if TurboModules are available
   */
  private static detectTurboModules(): boolean {
    try {
      return TurboModuleRegistry !== undefined && TurboModuleRegistry !== null;
    } catch {
      return false;
    }
  }

  /**
   * Detects JSI availability by testing TurboModule functionality
   * @returns true if JSI is available
   */
  private static detectJSI(): boolean {
    try {
      if (!TurboModuleRegistry) {
        return false;
      }

      // Test JSI by attempting to get a TurboModule
      // This will work if JSI is enabled, fail if not
      try {
        // Use getEnforcing to test JSI - it will throw if JSI is not available
        TurboModuleRegistry.get('ImageMarker');
        // If we get here without throwing, JSI is likely available
        return true;
      } catch (error) {
        // If getting the module throws, JSI might not be available
        // But we should also check if it's just that the module isn't registered
        const errorMessage = (error as any)?.message || '';
        if (errorMessage.includes('TurboModuleRegistry.getEnforcing')) {
          // This error suggests JSI is available but module isn't registered
          return true;
        }
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Detects Fabric renderer availability
   * @returns true if Fabric is available
   */
  private static detectFabric(): boolean {
    try {
      // Check for Fabric-specific APIs
      // Check for Fabric-specific components or APIs
      // Fabric introduces new APIs like UIManager.hasViewManagerConfig
      if (
        UIManager &&
        typeof (UIManager as any).hasViewManagerConfig === 'function'
      ) {
        return true;
      }

      // Check for other Fabric indicators
      if (
        typeof global !== 'undefined' &&
        (global as any).nativeFabricUIManager !== undefined
      ) {
        // This is a Fabric-era API
        return true;
      }

      // Check global flags that might indicate Fabric
      if ((global as any).__FABRIC__ === true) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Reset all cached detection results
   * Useful for testing purposes
   */
  static reset(): void {
    this._isNewArchitecture = null;
    this._hasTurboModules = null;
    this._hasJSI = null;
    this._hasFabric = null;
  }

  /**
   * Get detailed architecture information for debugging
   * @returns object with detailed architecture detection results
   */
  static getArchitectureInfo(): {
    isNewArchitecture: boolean;
    hasTurboModules: boolean;
    hasJSI: boolean;
    hasFabric: boolean;
  } {
    return {
      isNewArchitecture: this.isNewArchitecture(),
      hasTurboModules: this.hasTurboModules(),
      hasJSI: this.hasJSI(),
      hasFabric: this.hasFabric(),
    };
  }

  /**
   * Detects cross-platform architecture compatibility
   * This method provides a bridge to the CrossPlatformArchitectureManager
   * @returns Cross-platform architecture information
   */
  static detectCrossPlatformArchitecture(): CrossPlatformArchitectureInfo | null {
    try {
      // Lazy import to avoid circular dependencies
      const {
        CrossPlatformArchitectureManager,
      } = require('./CrossPlatformArchitectureManager');
      return CrossPlatformArchitectureManager.detectCrossPlatformArchitecture();
    } catch (error) {
      console.warn(
        'Cross-platform architecture detection not available:',
        error
      );
      return null;
    }
  }

  /**
   * Validates architecture consistency across platforms
   * @returns Validation result or null if cross-platform detection is not available
   */
  static validateArchitectureConsistency(): ArchitectureConsistencyResult | null {
    try {
      const {
        CrossPlatformArchitectureManager,
      } = require('./CrossPlatformArchitectureManager');
      return CrossPlatformArchitectureManager.validateArchitectureConsistency();
    } catch (error) {
      console.warn(
        'Cross-platform architecture validation not available:',
        error
      );
      return null;
    }
  }

  /**
   * Gets architecture switching recommendations
   * @returns Array of recommendations or empty array if not available
   */
  static getArchitectureRecommendations(): ArchitectureRecommendation[] {
    try {
      const {
        CrossPlatformArchitectureManager,
      } = require('./CrossPlatformArchitectureManager');
      return CrossPlatformArchitectureManager.getArchitectureRecommendations();
    } catch (error) {
      console.warn('Architecture recommendations not available:', error);
      return [];
    }
  }

  /**
   * Switches architecture across platforms
   * @param targetArchitecture Target architecture (legacy or new)
   * @param platforms Platforms to switch (optional, defaults to all)
   * @returns Switch result or null if not available
   */
  static switchArchitecture(
    targetArchitecture: 'legacy' | 'new',
    platforms?: ('android' | 'ios' | 'expo')[]
  ): ArchitectureSwitchResult | null {
    try {
      const {
        CrossPlatformArchitectureManager,
      } = require('./CrossPlatformArchitectureManager');
      return CrossPlatformArchitectureManager.switchArchitecture(
        targetArchitecture,
        platforms
      );
    } catch (error) {
      console.warn('Architecture switching not available:', error);
      return null;
    }
  }
}

// Type definitions for cross-platform functionality
export interface CrossPlatformArchitectureInfo {
  javascript: ArchitectureInfo;
  android: ArchitectureInfo;
  ios: ArchitectureInfo;
  expo: ArchitectureInfo;
  isConsistent: boolean;
  recommendedArchitecture: 'legacy' | 'new';
}

export interface ArchitectureInfo {
  platform: 'javascript' | 'android' | 'ios' | 'expo';
  isNewArchitecture: boolean;
  hasTurboModules: boolean;
  hasJSI: boolean;
  hasFabric: boolean;
  version: string;
  configurationSource: string;
}

export interface ArchitectureConsistencyResult {
  isConsistent: boolean;
  inconsistencies: ArchitectureInconsistency[];
  recommendations: string[];
}

export interface ArchitectureInconsistency {
  platforms: string[];
  issue: string;
  currentState: Record<string, string>;
}

export interface ArchitectureRecommendation {
  type:
    | 'version_upgrade'
    | 'consistency_fix'
    | 'performance_improvement'
    | 'dependency_fix';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
}

export interface ArchitectureSwitchResult {
  success: boolean;
  platformResults: Record<string, PlatformSwitchResult>;
  errors: string[];
  warnings: string[];
}

export interface PlatformSwitchResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  configChanges: ConfigChange[];
}

export interface ConfigChange {
  file: string;
  change: string;
}
