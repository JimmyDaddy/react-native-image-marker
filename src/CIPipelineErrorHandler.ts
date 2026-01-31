/**
 * CI Pipeline Error Handler and Diagnostic System
 *
 * Provides comprehensive error handling, diagnosis, and recovery suggestions
 * for cross-platform CI pipeline failures.
 */

export interface BuildError {
  id: string;
  platform: 'android' | 'ios' | 'cross-platform';
  architecture: 'legacy' | 'new' | 'both';
  rnVersion: string;
  errorType: ErrorType;
  message: string;
  stackTrace?: string;
  affectedFiles: string[];
  timestamp: Date;
  buildContext: BuildContext;
}

export interface BuildContext {
  jobName: string;
  buildMatrix: {
    platform: string;
    architecture: string;
    rnVersion: string;
    exampleApp?: string;
    apiLevel?: string;
    cocoapodsVersion?: string;
    xcodeVersion?: string;
  };
  environment: Record<string, string>;
  cacheStatus: CacheStatus;
}

export interface CacheStatus {
  gradle?: 'hit' | 'miss' | 'corrupted';
  cocoapods?: 'hit' | 'miss' | 'corrupted';
  nodeModules?: 'hit' | 'miss' | 'corrupted';
  rubyGems?: 'hit' | 'miss' | 'corrupted';
}

export interface DiagnosticResult {
  errorId: string;
  diagnosis: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: ErrorCategory;
  rootCause: string;
  affectedComponents: string[];
  recoveryActions: RecoveryAction[];
  preventionTips: string[];
  relatedErrors: string[];
}

export interface RecoveryAction {
  id: string;
  description: string;
  platform: 'android' | 'ios' | 'cross-platform';
  commands: string[];
  configChanges: ConfigChange[];
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  successRate: number; // 0-1
  requiresManualIntervention: boolean;
}

export interface ConfigChange {
  file: string;
  changes: Record<string, any>;
  platform: 'android' | 'ios' | 'cross-platform';
  requiresRestart: boolean;
  backupRecommended: boolean;
}

export enum ErrorType {
  // Android specific
  GRADLE_BUILD_FAILURE = 'gradle_build_failure',
  GRADLE_DEPENDENCY_CONFLICT = 'gradle_dependency_conflict',
  ANDROID_SDK_MISSING = 'android_sdk_missing',
  KOTLIN_COMPILATION_ERROR = 'kotlin_compilation_error',
  APK_BUILD_FAILURE = 'apk_build_failure',
  ANDROID_EMULATOR_ERROR = 'android_emulator_error',

  // iOS specific
  XCODE_BUILD_FAILURE = 'xcode_build_failure',
  COCOAPODS_INSTALL_FAILURE = 'cocoapods_install_failure',
  IOS_SIMULATOR_ERROR = 'ios_simulator_error',
  SWIFT_COMPILATION_ERROR = 'swift_compilation_error',
  PODSPEC_VALIDATION_ERROR = 'podspec_validation_error',
  PROVISIONING_PROFILE_ERROR = 'provisioning_profile_error',

  // Cross-platform
  CODEGEN_FAILURE = 'codegen_failure',
  VERSION_COMPATIBILITY_ERROR = 'version_compatibility_error',
  DEPENDENCY_RESOLUTION_ERROR = 'dependency_resolution_error',
  ARCHITECTURE_MISMATCH = 'architecture_mismatch',
  NODE_MODULES_CORRUPTION = 'node_modules_corruption',

  // CI specific
  CACHE_CORRUPTION = 'cache_corruption',
  PARALLEL_BUILD_CONFLICT = 'parallel_build_conflict',
  ARTIFACT_UPLOAD_FAILURE = 'artifact_upload_failure',
  ENVIRONMENT_SETUP_ERROR = 'environment_setup_error',
  TIMEOUT_ERROR = 'timeout_error',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
}

export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
  COMPILATION = 'compilation',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  INFRASTRUCTURE = 'infrastructure',
  CACHE = 'cache',
  ENVIRONMENT = 'environment',
}

export class CIPipelineErrorHandler {
  private errorDatabase: Map<string, BuildError> = new Map();
  private diagnosticRules: Map<
    ErrorType,
    (error: BuildError) => DiagnosticResult
  > = new Map();
  private recoveryStrategies: Map<ErrorType, RecoveryAction[]> = new Map();

  constructor() {
    this.initializeDiagnosticRules();
    this.initializeRecoveryStrategies();
  }

  /**
   * Record a build error for analysis and recovery
   */
  recordError(error: Omit<BuildError, 'id' | 'timestamp'>): string {
    const errorId = this.generateErrorId(error);
    const buildError: BuildError = {
      ...error,
      id: errorId,
      timestamp: new Date(),
    };

    this.errorDatabase.set(errorId, buildError);
    return errorId;
  }

  /**
   * Diagnose a build error and provide recovery recommendations
   */
  diagnoseError(errorId: string): DiagnosticResult | null {
    const error = this.errorDatabase.get(errorId);
    if (!error) {
      return null;
    }

    const diagnosticRule = this.diagnosticRules.get(error.errorType);
    if (!diagnosticRule) {
      return this.createGenericDiagnostic(error);
    }

    return diagnosticRule(error);
  }

  /**
   * Get recovery actions for a specific error
   */
  getRecoveryActions(errorId: string): RecoveryAction[] {
    const error = this.errorDatabase.get(errorId);
    if (!error) {
      return [];
    }

    const strategies = this.recoveryStrategies.get(error.errorType) || [];

    // Filter strategies by platform compatibility
    return strategies
      .filter(
        (strategy) =>
          strategy.platform === error.platform ||
          strategy.platform === 'cross-platform'
      )
      .sort((a, b) => {
        // Sort by priority and success rate
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return b.successRate - a.successRate;
      });
  }

  /**
   * Generate detailed error report for CI logs
   */
  generateErrorReport(errorId: string): string {
    const error = this.errorDatabase.get(errorId);
    const diagnostic = this.diagnoseError(errorId);
    const recoveryActions = this.getRecoveryActions(errorId);

    if (!error || !diagnostic) {
      return `Error report not available for ID: ${errorId}`;
    }

    const report = [
      '🚨 CI Pipeline Error Report',
      '='.repeat(50),
      '',
      `Error ID: ${error.id}`,
      `Platform: ${error.platform}`,
      `Architecture: ${error.architecture}`,
      `React Native Version: ${error.rnVersion}`,
      `Timestamp: ${error.timestamp.toISOString()}`,
      `Job: ${error.buildContext.jobName}`,
      '',
      '📋 Error Details:',
      '-'.repeat(20),
      `Type: ${error.errorType}`,
      `Message: ${error.message}`,
      error.stackTrace ? `Stack Trace:\n${error.stackTrace}` : '',
      `Affected Files: ${error.affectedFiles.join(', ')}`,
      '',
      '🔍 Diagnosis:',
      '-'.repeat(20),
      `Severity: ${diagnostic.severity.toUpperCase()}`,
      `Category: ${diagnostic.category}`,
      `Root Cause: ${diagnostic.rootCause}`,
      `Affected Components: ${diagnostic.affectedComponents.join(', ')}`,
      '',
      '💡 Recovery Actions:',
      '-'.repeat(20),
    ];

    recoveryActions.slice(0, 3).forEach((action, index) => {
      report.push(
        `${index + 1}. ${action.description} (Success Rate: ${Math.round(
          action.successRate * 100
        )}%)`
      );
      report.push(`   Priority: ${action.priority.toUpperCase()}`);
      report.push(`   Estimated Time: ${action.estimatedTime}`);
      if (action.commands.length > 0) {
        report.push(`   Commands:`);
        action.commands.forEach((cmd) => report.push(`     $ ${cmd}`));
      }
      report.push('');
    });

    if (diagnostic.preventionTips.length > 0) {
      report.push('🛡️ Prevention Tips:');
      report.push('-'.repeat(20));
      diagnostic.preventionTips.forEach((tip) => report.push(`• ${tip}`));
      report.push('');
    }

    if (diagnostic.relatedErrors.length > 0) {
      report.push('🔗 Related Errors:');
      report.push('-'.repeat(20));
      diagnostic.relatedErrors.forEach((relatedId) =>
        report.push(`• ${relatedId}`)
      );
    }

    return report.join('\n');
  }

  /**
   * Check if error should trigger retry mechanism
   */
  shouldRetry(errorId: string): {
    shouldRetry: boolean;
    maxRetries: number;
    backoffMs: number;
  } {
    const error = this.errorDatabase.get(errorId);
    if (!error) {
      return { shouldRetry: false, maxRetries: 0, backoffMs: 0 };
    }

    const retryableErrors = new Set([
      ErrorType.CACHE_CORRUPTION,
      ErrorType.ARTIFACT_UPLOAD_FAILURE,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RESOURCE_EXHAUSTION,
      ErrorType.ENVIRONMENT_SETUP_ERROR,
      ErrorType.ANDROID_EMULATOR_ERROR,
      ErrorType.IOS_SIMULATOR_ERROR,
    ]);

    if (!retryableErrors.has(error.errorType)) {
      return { shouldRetry: false, maxRetries: 0, backoffMs: 0 };
    }

    // Configure retry parameters based on error type
    switch (error.errorType) {
      case ErrorType.CACHE_CORRUPTION:
        return { shouldRetry: true, maxRetries: 2, backoffMs: 30000 }; // 30s backoff
      case ErrorType.TIMEOUT_ERROR:
        return { shouldRetry: true, maxRetries: 1, backoffMs: 60000 }; // 1min backoff
      case ErrorType.RESOURCE_EXHAUSTION:
        return { shouldRetry: true, maxRetries: 3, backoffMs: 120000 }; // 2min backoff
      default:
        return { shouldRetry: true, maxRetries: 1, backoffMs: 30000 };
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByPlatform: Record<string, number>;
    errorsByType: Record<string, number>;
    errorsByArchitecture: Record<string, number>;
    recentErrors: BuildError[];
  } {
    const errors = Array.from(this.errorDatabase.values());
    const recentErrors = errors
      .filter(
        (error) => Date.now() - error.timestamp.getTime() < 24 * 60 * 60 * 1000
      ) // Last 24 hours
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    const errorsByPlatform: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};
    const errorsByArchitecture: Record<string, number> = {};

    errors.forEach((error) => {
      errorsByPlatform[error.platform] =
        (errorsByPlatform[error.platform] || 0) + 1;
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      errorsByArchitecture[error.architecture] =
        (errorsByArchitecture[error.architecture] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByPlatform,
      errorsByType,
      errorsByArchitecture,
      recentErrors,
    };
  }

  private generateErrorId(error: Omit<BuildError, 'id' | 'timestamp'>): string {
    const hash = this.simpleHash(
      `${error.platform}-${error.errorType}-${error.message}-${Date.now()}`
    );
    return `err_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      // eslint-disable-next-line no-bitwise
      hash = (hash << 5) - hash + char;
      // eslint-disable-next-line no-bitwise
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private createGenericDiagnostic(error: BuildError): DiagnosticResult {
    return {
      errorId: error.id,
      diagnosis: `Generic error analysis for ${error.errorType}`,
      severity: 'medium',
      category: ErrorCategory.CONFIGURATION,
      rootCause: 'Unknown root cause - requires manual investigation',
      affectedComponents: [error.platform],
      recoveryActions: [],
      preventionTips: [
        'Review build logs for more details',
        'Check platform-specific documentation',
      ],
      relatedErrors: [],
    };
  }

  private initializeDiagnosticRules(): void {
    // Android diagnostic rules
    this.diagnosticRules.set(ErrorType.GRADLE_BUILD_FAILURE, (error) => ({
      errorId: error.id,
      diagnosis:
        'Gradle build process failed during compilation or dependency resolution',
      severity: 'high',
      category: ErrorCategory.COMPILATION,
      rootCause:
        'Gradle configuration issues, dependency conflicts, or compilation errors',
      affectedComponents: [
        'Android build system',
        'Gradle wrapper',
        'Dependencies',
      ],
      recoveryActions: this.getRecoveryActions(error.id),
      preventionTips: [
        'Keep Gradle and Android Gradle Plugin versions in sync with React Native version',
        'Use dependency resolution strategies for version conflicts',
        'Enable Gradle build cache for faster builds',
      ],
      relatedErrors: [],
    }));

    this.diagnosticRules.set(ErrorType.COCOAPODS_INSTALL_FAILURE, (error) => ({
      errorId: error.id,
      diagnosis: 'CocoaPods failed to install or update dependencies',
      severity: 'high',
      category: ErrorCategory.DEPENDENCY,
      rootCause:
        'CocoaPods version incompatibility, corrupted cache, or network issues',
      affectedComponents: [
        'iOS dependencies',
        'CocoaPods cache',
        'Podfile configuration',
      ],
      recoveryActions: this.getRecoveryActions(error.id),
      preventionTips: [
        'Pin CocoaPods version in CI environment',
        'Use CocoaPods cache to speed up builds',
        'Validate Podfile.lock consistency across environments',
      ],
      relatedErrors: [],
    }));

    this.diagnosticRules.set(ErrorType.CODEGEN_FAILURE, (error) => ({
      errorId: error.id,
      diagnosis: 'React Native Codegen failed to generate native interfaces',
      severity: 'critical',
      category: ErrorCategory.COMPILATION,
      rootCause:
        'Invalid TypeScript specifications, missing dependencies, or version incompatibility',
      affectedComponents: [
        'TurboModule interfaces',
        'Fabric components',
        'Native bindings',
      ],
      recoveryActions: this.getRecoveryActions(error.id),
      preventionTips: [
        'Validate TypeScript specs syntax before committing',
        'Ensure Codegen configuration matches React Native version',
        'Test both Legacy and New Architecture builds',
      ],
      relatedErrors: [],
    }));

    this.diagnosticRules.set(ErrorType.CACHE_CORRUPTION, (error) => ({
      errorId: error.id,
      diagnosis:
        'Build cache corruption detected, causing inconsistent build results',
      severity: 'medium',
      category: ErrorCategory.CACHE,
      rootCause:
        'Corrupted cache files, incomplete cache writes, or cache key conflicts',
      affectedComponents: [
        'Gradle cache',
        'CocoaPods cache',
        'Node modules cache',
      ],
      recoveryActions: this.getRecoveryActions(error.id),
      preventionTips: [
        'Implement cache validation checks',
        'Use cache versioning to avoid conflicts',
        'Monitor cache hit rates and performance',
      ],
      relatedErrors: [],
    }));
  }

  private initializeRecoveryStrategies(): void {
    // Android recovery strategies
    this.recoveryStrategies.set(ErrorType.GRADLE_BUILD_FAILURE, [
      {
        id: 'gradle_clean_build',
        description: 'Clean Gradle cache and rebuild',
        platform: 'android',
        commands: [
          'cd android',
          './gradlew clean',
          './gradlew build --refresh-dependencies',
        ],
        configChanges: [],
        priority: 'high',
        estimatedTime: '5-10 minutes',
        successRate: 0.85,
        requiresManualIntervention: false,
      },
      {
        id: 'gradle_dependency_resolution',
        description: 'Force dependency resolution and update',
        platform: 'android',
        commands: [
          'cd android',
          './gradlew dependencies --refresh-dependencies',
          './gradlew build --refresh-dependencies --rerun-tasks',
        ],
        configChanges: [],
        priority: 'medium',
        estimatedTime: '10-15 minutes',
        successRate: 0.75,
        requiresManualIntervention: false,
      },
    ]);

    // iOS recovery strategies
    this.recoveryStrategies.set(ErrorType.COCOAPODS_INSTALL_FAILURE, [
      {
        id: 'cocoapods_clean_install',
        description: 'Clean CocoaPods cache and reinstall',
        platform: 'ios',
        commands: [
          'cd ios',
          'pod cache clean --all',
          'rm -rf Pods Podfile.lock',
          'pod install --repo-update',
        ],
        configChanges: [],
        priority: 'high',
        estimatedTime: '5-15 minutes',
        successRate: 0.9,
        requiresManualIntervention: false,
      },
      {
        id: 'cocoapods_version_fix',
        description: 'Update CocoaPods to compatible version',
        platform: 'ios',
        commands: [
          'gem install cocoapods -v 1.15.2',
          'cd ios',
          'pod install --repo-update',
        ],
        configChanges: [],
        priority: 'medium',
        estimatedTime: '3-8 minutes',
        successRate: 0.8,
        requiresManualIntervention: false,
      },
    ]);

    // Cross-platform recovery strategies
    this.recoveryStrategies.set(ErrorType.CODEGEN_FAILURE, [
      {
        id: 'codegen_regenerate',
        description: 'Clean and regenerate Codegen files',
        platform: 'cross-platform',
        commands: [
          'rm -rf node_modules/.cache',
          'yarn install',
          'npx react-native codegen',
        ],
        configChanges: [],
        priority: 'high',
        estimatedTime: '3-5 minutes',
        successRate: 0.85,
        requiresManualIntervention: false,
      },
      {
        id: 'codegen_spec_validation',
        description: 'Validate and fix TypeScript specifications',
        platform: 'cross-platform',
        commands: [
          'npx tsc --noEmit specs/NativeImageMarker.ts',
          'yarn typecheck',
        ],
        configChanges: [],
        priority: 'high',
        estimatedTime: '2-3 minutes',
        successRate: 0.7,
        requiresManualIntervention: true,
      },
    ]);

    // Cache recovery strategies
    this.recoveryStrategies.set(ErrorType.CACHE_CORRUPTION, [
      {
        id: 'clear_all_caches',
        description: 'Clear all build caches and restart fresh',
        platform: 'cross-platform',
        commands: [
          'rm -rf ~/.gradle/caches',
          'rm -rf ~/Library/Caches/CocoaPods',
          'rm -rf node_modules',
          'yarn install',
        ],
        configChanges: [],
        priority: 'high',
        estimatedTime: '10-20 minutes',
        successRate: 0.95,
        requiresManualIntervention: false,
      },
    ]);
  }
}

// Singleton instance for global error handling
export const ciPipelineErrorHandler = new CIPipelineErrorHandler();
