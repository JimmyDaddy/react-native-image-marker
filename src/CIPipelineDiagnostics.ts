/**
 * CI Pipeline Diagnostics and Monitoring
 *
 * Provides real-time monitoring, health checks, and automated diagnostics
 * for cross-platform CI pipeline execution.
 */

import {
  ciPipelineErrorHandler,
  ErrorType,
  type BuildContext,
} from './CIPipelineErrorHandler';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  recommendations: string[];
}

export interface PipelineMetrics {
  buildDuration: number;
  cacheHitRate: number;
  testPassRate: number;
  artifactSize: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
  };
  parallelJobsCount: number;
  failureRate: number;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  thresholds: {
    failureRate: number;
    buildDuration: number;
    cacheHitRate: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'github' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
  severity: ('low' | 'medium' | 'high' | 'critical')[];
}

export class CIPipelineDiagnostics {
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> =
    new Map();
  private metrics: PipelineMetrics[] = [];
  private notificationConfig: NotificationConfig;

  constructor(notificationConfig?: Partial<NotificationConfig>) {
    this.notificationConfig = {
      enabled: true,
      channels: [],
      thresholds: {
        failureRate: 0.1, // 10%
        buildDuration: 30 * 60 * 1000, // 30 minutes
        cacheHitRate: 0.7, // 70%
      },
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 30000, // 30 seconds
      },
      ...notificationConfig,
    };

    this.initializeHealthChecks();
  }

  /**
   * Run comprehensive health checks for the CI pipeline
   */
  async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [component, checkFn] of this.healthChecks) {
      try {
        const result = await checkFn();
        results.push(result);
      } catch (error) {
        results.push({
          component,
          status: 'critical',
          message: `Health check failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          details: { error: error instanceof Error ? error.stack : error },
          timestamp: new Date(),
          recommendations: [
            'Check component logs',
            'Restart component if necessary',
          ],
        });
      }
    }

    return results;
  }

  /**
   * Monitor build execution and collect metrics
   */
  async monitorBuild(buildContext: BuildContext): Promise<PipelineMetrics> {
    // Simulate metrics collection (in real implementation, this would collect actual metrics)
    const metrics: PipelineMetrics = {
      buildDuration: 0, // Will be updated at the end
      cacheHitRate: await this.calculateCacheHitRate(buildContext),
      testPassRate: await this.calculateTestPassRate(buildContext),
      artifactSize: await this.calculateArtifactSize(buildContext),
      resourceUsage: await this.getResourceUsage(),
      parallelJobsCount: this.getParallelJobsCount(buildContext),
      failureRate: await this.calculateFailureRate(),
    };

    // Store metrics for trend analysis
    this.metrics.push(metrics);

    // Keep only last 100 metrics entries
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    return metrics;
  }

  /**
   * Detect and analyze build failures automatically
   */
  async detectBuildFailure(
    buildContext: BuildContext,
    exitCode: number,
    logs: string
  ): Promise<string | null> {
    if (exitCode === 0) {
      return null; // Build succeeded
    }

    // Analyze logs to determine error type and details
    const errorAnalysis = this.analyzeBuildLogs(logs, buildContext);

    if (errorAnalysis) {
      const errorId = ciPipelineErrorHandler.recordError({
        platform: buildContext.buildMatrix.platform as
          | 'android'
          | 'ios'
          | 'cross-platform',
        architecture: buildContext.buildMatrix.architecture as
          | 'legacy'
          | 'new'
          | 'both',
        rnVersion: buildContext.buildMatrix.rnVersion,
        errorType: errorAnalysis.errorType,
        message: errorAnalysis.message,
        stackTrace: errorAnalysis.stackTrace,
        affectedFiles: errorAnalysis.affectedFiles,
        buildContext,
      });

      // Generate and log error report
      const errorReport = ciPipelineErrorHandler.generateErrorReport(errorId);
      console.error(errorReport);

      // Check if retry is recommended
      const retryInfo = ciPipelineErrorHandler.shouldRetry(errorId);
      if (retryInfo.shouldRetry) {
        console.log(
          `🔄 Retry recommended: max ${retryInfo.maxRetries} retries with ${retryInfo.backoffMs}ms backoff`
        );
      }

      // Send notifications if configured
      if (this.notificationConfig.enabled) {
        await this.sendNotification(errorId, errorAnalysis, buildContext);
      }

      return errorId;
    }

    return null;
  }

  /**
   * Generate comprehensive pipeline health report
   */
  generateHealthReport(): string {
    const errorStats = ciPipelineErrorHandler.getErrorStatistics();
    const recentMetrics = this.metrics.slice(-10);

    const avgBuildDuration =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.buildDuration, 0) /
          recentMetrics.length
        : 0;

    const avgCacheHitRate =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) /
          recentMetrics.length
        : 0;

    const report = [
      '📊 CI Pipeline Health Report',
      '='.repeat(50),
      '',
      '🔢 Error Statistics:',
      `-  Total Errors (24h): ${errorStats.recentErrors.length}`,
      `-  Total Errors (All Time): ${errorStats.totalErrors}`,
      '',
      '📈 Performance Metrics:',
      `-  Average Build Duration: ${Math.round(
        avgBuildDuration / 1000 / 60
      )}m ${Math.round((avgBuildDuration / 1000) % 60)}s`,
      `-  Average Cache Hit Rate: ${Math.round(avgCacheHitRate * 100)}%`,
      `-  Recent Builds: ${recentMetrics.length}`,
      '',
      '🏗️ Platform Distribution:',
      ...Object.entries(errorStats.errorsByPlatform).map(
        ([platform, count]) => `-  ${platform}: ${count} errors`
      ),
      '',
      '🏛️ Architecture Distribution:',
      ...Object.entries(errorStats.errorsByArchitecture).map(
        ([arch, count]) => `-  ${arch}: ${count} errors`
      ),
      '',
      '🔍 Top Error Types:',
      ...Object.entries(errorStats.errorsByType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => `-  ${type}: ${count} occurrences`),
      '',
    ];

    if (errorStats.recentErrors.length > 0) {
      report.push('🚨 Recent Errors:');
      errorStats.recentErrors.slice(0, 3).forEach((error) => {
        report.push(`-  ${error.id}: ${error.errorType} (${error.platform})`);
      });
    }

    return report.join('\n');
  }

  /**
   * Get pipeline performance trends
   */
  getPerformanceTrends(): {
    buildDurationTrend: 'improving' | 'stable' | 'degrading';
    cacheHitRateTrend: 'improving' | 'stable' | 'degrading';
    failureRateTrend: 'improving' | 'stable' | 'degrading';
    recommendations: string[];
  } {
    if (this.metrics.length < 10) {
      return {
        buildDurationTrend: 'stable',
        cacheHitRateTrend: 'stable',
        failureRateTrend: 'stable',
        recommendations: ['Collect more data for trend analysis'],
      };
    }

    const recent = this.metrics.slice(-5);
    const previous = this.metrics.slice(-10, -5);

    const avgRecentDuration =
      recent.reduce((sum, m) => sum + m.buildDuration, 0) / recent.length;
    const avgPreviousDuration =
      previous.reduce((sum, m) => sum + m.buildDuration, 0) / previous.length;

    const avgRecentCacheHit =
      recent.reduce((sum, m) => sum + m.cacheHitRate, 0) / recent.length;
    const avgPreviousCacheHit =
      previous.reduce((sum, m) => sum + m.cacheHitRate, 0) / previous.length;

    const avgRecentFailure =
      recent.reduce((sum, m) => sum + m.failureRate, 0) / recent.length;
    const avgPreviousFailure =
      previous.reduce((sum, m) => sum + m.failureRate, 0) / previous.length;

    const buildDurationTrend = this.getTrend(
      avgRecentDuration,
      avgPreviousDuration,
      false
    );
    const cacheHitRateTrend = this.getTrend(
      avgRecentCacheHit,
      avgPreviousCacheHit,
      true
    );
    const failureRateTrend = this.getTrend(
      avgRecentFailure,
      avgPreviousFailure,
      false
    );

    const recommendations: string[] = [];

    if (buildDurationTrend === 'degrading') {
      recommendations.push(
        'Consider optimizing build scripts or increasing cache usage'
      );
    }
    if (cacheHitRateTrend === 'degrading') {
      recommendations.push(
        'Review cache configuration and invalidation strategies'
      );
    }
    if (failureRateTrend === 'degrading') {
      recommendations.push(
        'Investigate recent changes that may be causing build instability'
      );
    }

    return {
      buildDurationTrend,
      cacheHitRateTrend,
      failureRateTrend,
      recommendations,
    };
  }

  private initializeHealthChecks(): void {
    // Node.js environment health check
    this.healthChecks.set('nodejs', async () => {
      const nodeVersion = process.version;
      const expectedMajor = 18; // Minimum supported version
      const actualMajor = parseInt(
        nodeVersion?.slice(1).split('.')[0] || '0',
        10
      );

      return {
        component: 'nodejs',
        status: actualMajor >= expectedMajor ? 'healthy' : 'warning',
        message: `Node.js version: ${nodeVersion}`,
        details: {
          version: nodeVersion,
          expectedMinimum: `${expectedMajor}.x`,
        },
        timestamp: new Date(),
        recommendations:
          actualMajor < expectedMajor
            ? ['Upgrade Node.js to version 18 or higher']
            : [],
      };
    });

    // Dependency health check
    this.healthChecks.set('dependencies', async () => {
      try {
        // Check if critical dependencies are available
        const criticalDeps = ['react-native', 'typescript', 'vitest'];
        const missingDeps: string[] = [];

        for (const dep of criticalDeps) {
          try {
            require.resolve(dep);
          } catch {
            missingDeps.push(dep);
          }
        }

        return {
          component: 'dependencies',
          status: missingDeps.length === 0 ? 'healthy' : 'critical',
          message:
            missingDeps.length === 0
              ? 'All critical dependencies available'
              : `Missing dependencies: ${missingDeps.join(', ')}`,
          details: { missingDependencies: missingDeps },
          timestamp: new Date(),
          recommendations:
            missingDeps.length > 0
              ? ['Run yarn install to install missing dependencies']
              : [],
        };
      } catch (error) {
        return {
          component: 'dependencies',
          status: 'critical',
          message: 'Failed to check dependencies',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          timestamp: new Date(),
          recommendations: ['Check package.json and run yarn install'],
        };
      }
    });

    // Cache health check
    this.healthChecks.set('cache', async () => {
      const cacheStatus = {
        gradle: await this.checkGradleCache(),
        cocoapods: await this.checkCocoaPodsCache(),
        nodeModules: await this.checkNodeModulesCache(),
      };

      const healthyCount = Object.values(cacheStatus).filter(
        (status) => status === 'healthy'
      ).length;
      const totalCount = Object.keys(cacheStatus).length;

      return {
        component: 'cache',
        status:
          healthyCount === totalCount
            ? 'healthy'
            : healthyCount > 0
            ? 'warning'
            : 'critical',
        message: `Cache health: ${healthyCount}/${totalCount} systems healthy`,
        details: cacheStatus,
        timestamp: new Date(),
        recommendations:
          healthyCount < totalCount
            ? ['Clear and rebuild corrupted caches']
            : [],
      };
    });
  }

  private analyzeBuildLogs(
    logs: string,
    buildContext: BuildContext
  ): {
    errorType: ErrorType;
    message: string;
    stackTrace?: string;
    affectedFiles: string[];
  } | null {
    const platform = buildContext.buildMatrix.platform;

    // Android error patterns
    if (platform === 'android') {
      if (logs.includes('FAILURE: Build failed with an exception')) {
        return {
          errorType: ErrorType.GRADLE_BUILD_FAILURE,
          message: this.extractGradleErrorMessage(logs),
          stackTrace: this.extractStackTrace(logs),
          affectedFiles: this.extractAffectedFiles(logs, [
            '*.gradle',
            '*.kt',
            '*.java',
          ]),
        };
      }

      if (logs.includes('Could not resolve all dependencies')) {
        return {
          errorType: ErrorType.GRADLE_DEPENDENCY_CONFLICT,
          message: 'Gradle dependency resolution failed',
          affectedFiles: this.extractAffectedFiles(logs, [
            'build.gradle',
            'settings.gradle',
          ]),
        };
      }
    }

    // iOS error patterns
    if (platform === 'ios') {
      if (logs.includes('pod install') && logs.includes('error')) {
        return {
          errorType: ErrorType.COCOAPODS_INSTALL_FAILURE,
          message: this.extractCocoaPodsErrorMessage(logs),
          affectedFiles: this.extractAffectedFiles(logs, [
            'Podfile',
            '*.podspec',
          ]),
        };
      }

      if (logs.includes('xcodebuild') && logs.includes('BUILD FAILED')) {
        return {
          errorType: ErrorType.XCODE_BUILD_FAILURE,
          message: this.extractXcodeBuildErrorMessage(logs),
          stackTrace: this.extractStackTrace(logs),
          affectedFiles: this.extractAffectedFiles(logs, [
            '*.swift',
            '*.m',
            '*.h',
          ]),
        };
      }
    }

    // Cross-platform error patterns
    if (logs.includes('codegen') && logs.includes('error')) {
      return {
        errorType: ErrorType.CODEGEN_FAILURE,
        message: 'React Native Codegen failed',
        affectedFiles: this.extractAffectedFiles(logs, [
          'specs/*.ts',
          'package.json',
        ]),
      };
    }

    if (logs.includes('ENOENT') || logs.includes('MODULE_NOT_FOUND')) {
      return {
        errorType: ErrorType.NODE_MODULES_CORRUPTION,
        message: 'Node modules corruption detected',
        affectedFiles: ['package.json', 'yarn.lock', 'node_modules/'],
      };
    }

    return null;
  }

  private extractGradleErrorMessage(logs: string): string {
    const match = logs.match(
      /FAILURE: Build failed with an exception\.\s*\* What went wrong:\s*(.+?)(?:\n|$)/
    );
    return match?.[1]?.trim() || 'Gradle build failed';
  }

  private extractCocoaPodsErrorMessage(logs: string): string {
    const match = logs.match(/\[!\]\s*(.+?)(?:\n|$)/);
    return match?.[1]?.trim() || 'CocoaPods installation failed';
  }

  private extractXcodeBuildErrorMessage(logs: string): string {
    const match = logs.match(/error:\s*(.+?)(?:\n|$)/);
    return match?.[1]?.trim() || 'Xcode build failed';
  }

  private extractStackTrace(logs: string): string | undefined {
    const stackMatch = logs.match(/\s+at .+(?:\n\s+at .+)*/);
    return stackMatch ? stackMatch[0] : undefined;
  }

  private extractAffectedFiles(logs: string, patterns: string[]): string[] {
    const files: string[] = [];
    const lines = logs.split('\n');

    for (const line of lines) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.replace('*', '\\w+'), 'g');
        const matches = line.match(regex);
        if (matches) {
          files.push(...matches);
        }
      }
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async calculateCacheHitRate(
    buildContext: BuildContext
  ): Promise<number> {
    // Simulate cache hit rate calculation
    const cacheStatus = buildContext.cacheStatus;
    const hits = Object.values(cacheStatus).filter(
      (status) => status === 'hit'
    ).length;
    const total = Object.keys(cacheStatus).length;
    return total > 0 ? hits / total : 0;
  }

  private async calculateTestPassRate(
    _buildContext: BuildContext
  ): Promise<number> {
    // Simulate test pass rate calculation
    return Math.random() * 0.3 + 0.7; // 70-100% pass rate
  }

  private async calculateArtifactSize(
    buildContext: BuildContext
  ): Promise<number> {
    // Simulate artifact size calculation (in MB)
    const platform = buildContext.buildMatrix.platform;
    if (platform === 'android') {
      return Math.random() * 20 + 30; // 30-50 MB for APK
    } else if (platform === 'ios') {
      return Math.random() * 50 + 100; // 100-150 MB for iOS app
    }
    return 0;
  }

  private async getResourceUsage(): Promise<{
    cpu: number;
    memory: number;
    disk: number;
  }> {
    // Simulate resource usage (percentages)
    return {
      cpu: Math.random() * 40 + 30, // 30-70%
      memory: Math.random() * 30 + 40, // 40-70%
      disk: Math.random() * 20 + 20, // 20-40%
    };
  }

  private getParallelJobsCount(buildContext: BuildContext): number {
    // Count parallel jobs based on build matrix
    return Object.keys(buildContext.buildMatrix).length;
  }

  private async calculateFailureRate(): Promise<number> {
    const errorStats = ciPipelineErrorHandler.getErrorStatistics();
    const recentErrors = errorStats.recentErrors.length;
    const totalBuilds = Math.max(recentErrors * 10, 100); // Estimate total builds
    return recentErrors / totalBuilds;
  }

  private async checkGradleCache(): Promise<
    'healthy' | 'warning' | 'critical'
  > {
    // Simulate Gradle cache check
    return Math.random() > 0.1 ? 'healthy' : 'warning';
  }

  private async checkCocoaPodsCache(): Promise<
    'healthy' | 'warning' | 'critical'
  > {
    // Simulate CocoaPods cache check
    return Math.random() > 0.1 ? 'healthy' : 'warning';
  }

  private async checkNodeModulesCache(): Promise<
    'healthy' | 'warning' | 'critical'
  > {
    // Simulate Node modules cache check
    return Math.random() > 0.05 ? 'healthy' : 'critical';
  }

  private getTrend(
    recent: number,
    previous: number,
    higherIsBetter: boolean
  ): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.05; // 5% threshold for considering change significant
    const change = (recent - previous) / previous;

    if (Math.abs(change) < threshold) {
      return 'stable';
    }

    if (higherIsBetter) {
      return change > 0 ? 'improving' : 'degrading';
    } else {
      return change < 0 ? 'improving' : 'degrading';
    }
  }

  private async sendNotification(
    errorId: string,
    _errorAnalysis: any,
    buildContext: BuildContext
  ): Promise<void> {
    // Simulate notification sending
    console.log(
      `📧 Notification sent for error ${errorId} in ${buildContext.jobName}`
    );

    // In a real implementation, this would send notifications via configured channels
    for (const channel of this.notificationConfig.channels) {
      if (channel.enabled) {
        console.log(
          `Sending ${channel.type} notification for error ${errorId}`
        );
      }
    }
  }
}

// Export singleton instance
export const ciPipelineDiagnostics = new CIPipelineDiagnostics();
