#!/usr/bin/env node

/**
 * CI Error Handler Script
 *
 * Integrates error handling and diagnostics into CI pipeline.
 * Usage: node scripts/ci-error-handler.js <command> [options]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import our error handling modules (would be compiled JS in real usage)
// For now, we'll simulate the functionality

class CIErrorHandlerScript {
  constructor() {
    this.buildContext = this.detectBuildContext();
    this.logFile = path.join(process.cwd(), 'ci-build.log');
    this.errorReportFile = path.join(process.cwd(), 'ci-error-report.md');
  }

  /**
   * Main entry point for CI error handling
   */
  async run() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    console.log('🔧 CI Error Handler Starting...');
    console.log(`Command: ${command}`);
    console.log(`Build Context: ${JSON.stringify(this.buildContext, null, 2)}`);

    try {
      switch (command) {
        case 'monitor':
          await this.monitorBuild(args);
          break;
        case 'diagnose':
          await this.diagnoseBuild(args);
          break;
        case 'health-check':
          await this.runHealthCheck();
          break;
        case 'report':
          await this.generateReport();
          break;
        case 'retry':
          await this.retryBuild(args);
          break;
        default:
          this.showUsage();
      }
    } catch (error) {
      console.error('❌ CI Error Handler failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Monitor a build command and handle errors
   */
  async monitorBuild(args) {
    if (args.length === 0) {
      throw new Error('No build command provided');
    }

    const buildCommand = args.join(' ');
    console.log(`🏗️ Monitoring build: ${buildCommand}`);

    const startTime = Date.now();
    let exitCode = 0;
    let buildOutput = '';

    try {
      // Execute build command and capture output
      const result = execSync(buildCommand, {
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
      buildOutput = result;
      console.log('✅ Build completed successfully');
    } catch (error) {
      exitCode = error.status || 1;
      buildOutput = error.stdout + error.stderr;
      console.error('❌ Build failed with exit code:', exitCode);
    }

    const buildDuration = Date.now() - startTime;

    // Save build log
    fs.writeFileSync(this.logFile, buildOutput);

    // Analyze build failure if it occurred
    if (exitCode !== 0) {
      await this.analyzeBuildFailure(exitCode, buildOutput, buildDuration);
    } else {
      await this.recordBuildSuccess(buildDuration);
    }

    process.exit(exitCode);
  }

  /**
   * Diagnose existing build logs
   */
  async diagnoseBuild(args) {
    const logFile = args[0] || this.logFile;

    if (!fs.existsSync(logFile)) {
      throw new Error(`Log file not found: ${logFile}`);
    }

    console.log(`🔍 Diagnosing build from log: ${logFile}`);

    const buildOutput = fs.readFileSync(logFile, 'utf8');
    const errorAnalysis = this.analyzeBuildLogs(buildOutput);

    if (errorAnalysis) {
      console.log('🚨 Error detected:');
      console.log(`Type: ${errorAnalysis.errorType}`);
      console.log(`Message: ${errorAnalysis.message}`);
      console.log(`Affected Files: ${errorAnalysis.affectedFiles.join(', ')}`);

      // Generate recovery recommendations
      const recoveryActions = this.getRecoveryActions(errorAnalysis.errorType);
      if (recoveryActions.length > 0) {
        console.log('\n💡 Recommended Recovery Actions:');
        recoveryActions.forEach((action, index) => {
          console.log(`${index + 1}. ${action.description}`);
          console.log(`   Priority: ${action.priority}`);
          console.log(
            `   Success Rate: ${Math.round(action.successRate * 100)}%`
          );
          if (action.commands.length > 0) {
            console.log(`   Commands:`);
            action.commands.forEach((cmd) => console.log(`     $ ${cmd}`));
          }
          console.log('');
        });
      }
    } else {
      console.log('✅ No specific errors detected in build logs');
    }
  }

  /**
   * Run comprehensive health checks
   */
  async runHealthCheck() {
    console.log('🏥 Running CI Pipeline Health Checks...');

    const healthChecks = [
      { name: 'Node.js Version', check: () => this.checkNodeVersion() },
      { name: 'Dependencies', check: () => this.checkDependencies() },
      { name: 'Build Tools', check: () => this.checkBuildTools() },
      { name: 'Cache Status', check: () => this.checkCacheStatus() },
      { name: 'Environment Variables', check: () => this.checkEnvironment() },
    ];

    const results = [];

    for (const { name, check } of healthChecks) {
      try {
        const result = await check();
        results.push({ name, ...result });
        const statusIcon =
          result.status === 'healthy'
            ? '✅'
            : result.status === 'warning'
            ? '⚠️'
            : '❌';
        console.log(`${statusIcon} ${name}: ${result.message}`);
      } catch (error) {
        results.push({
          name,
          status: 'critical',
          message: `Health check failed: ${error.message}`,
          recommendations: ['Check component manually'],
        });
        console.log(`❌ ${name}: Health check failed - ${error.message}`);
      }
    }

    // Generate health report
    const healthReport = this.generateHealthReport(results);
    fs.writeFileSync('ci-health-report.md', healthReport);
    console.log('\n📊 Health report saved to ci-health-report.md');

    // Exit with error if any critical issues found (but not during pre-install phase)
    const criticalIssues = results.filter((r) => r.status === 'critical');
    const nodeModulesExists = fs.existsSync(
      path.join(process.cwd(), 'node_modules')
    );
    const isPreInstall = !nodeModulesExists;

    if (criticalIssues.length > 0 && !isPreInstall) {
      console.error(`\n❌ ${criticalIssues.length} critical issues found`);
      process.exit(1);
    } else if (criticalIssues.length > 0 && isPreInstall) {
      console.log(
        `\n⚠️ ${criticalIssues.length} issues found (pre-install phase - will be resolved after dependency installation)`
      );
    }
  }

  /**
   * Generate comprehensive error and performance report
   */
  async generateReport() {
    console.log('📊 Generating CI Pipeline Report...');

    const report = [
      '# CI Pipeline Report',
      `Generated: ${new Date().toISOString()}`,
      `Build Context: ${this.buildContext.jobName}`,
      '',
      '## Build Configuration',
      `- Platform: ${this.buildContext.buildMatrix.platform}`,
      `- Architecture: ${this.buildContext.buildMatrix.architecture}`,
      `- React Native Version: ${this.buildContext.buildMatrix.rnVersion}`,
      `- Example App: ${this.buildContext.buildMatrix.exampleApp || 'N/A'}`,
      '',
      '## Environment Information',
      `- Node.js: ${process.version}`,
      `- Platform: ${process.platform}`,
      `- Architecture: ${process.arch}`,
      `- CI: ${process.env.CI || 'false'}`,
      `- GitHub Actions: ${process.env.GITHUB_ACTIONS || 'false'}`,
      '',
      '## Cache Status',
      this.formatCacheStatus(),
      '',
      '## Recommendations',
      ...this.generateRecommendations(),
      '',
    ];

    const reportContent = report.join('\n');
    fs.writeFileSync(this.errorReportFile, reportContent);
    console.log(`📄 Report saved to ${this.errorReportFile}`);
  }

  /**
   * Retry failed build with recovery actions
   */
  async retryBuild(args) {
    const maxRetries = parseInt(args[0], 10) || 3;
    const buildCommand = args.slice(1).join(' ');

    if (!buildCommand) {
      throw new Error('No build command provided for retry');
    }

    console.log(`🔄 Retrying build with max ${maxRetries} attempts`);
    console.log(`Command: ${buildCommand}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${maxRetries}`);

      if (attempt > 1) {
        // Apply recovery actions before retry
        await this.applyRecoveryActions();

        // Wait with exponential backoff
        const backoffMs = Math.min(30000 * Math.pow(2, attempt - 2), 300000); // Max 5 minutes
        console.log(`⏳ Waiting ${backoffMs / 1000}s before retry...`);
        await this.sleep(backoffMs);
      }

      try {
        execSync(buildCommand, { stdio: 'inherit' });
        console.log(`✅ Build succeeded on attempt ${attempt}`);
        process.exit(0);
      } catch (error) {
        console.error(
          `❌ Attempt ${attempt} failed with exit code: ${error.status}`
        );

        if (attempt === maxRetries) {
          console.error('💥 All retry attempts exhausted');
          process.exit(error.status || 1);
        }
      }
    }
  }

  /**
   * Detect current build context from environment
   */
  detectBuildContext() {
    const env = process.env;

    return {
      jobName: env.GITHUB_JOB || env.JOB_NAME || 'local-build',
      buildMatrix: {
        platform: env.MATRIX_PLATFORM || 'cross-platform',
        architecture: env.MATRIX_ARCHITECTURE || 'both',
        rnVersion: env.MATRIX_RN_VERSION || '0.73',
        exampleApp: env.MATRIX_EXAMPLE_APP,
        apiLevel: env.MATRIX_API_LEVEL,
        cocoapodsVersion: env.MATRIX_COCOAPODS,
        xcodeVersion: env.MATRIX_XCODE_VERSION,
      },
      environment: {
        CI: env.CI || 'false',
        GITHUB_ACTIONS: env.GITHUB_ACTIONS || 'false',
        NODE_VERSION: process.version,
        PLATFORM: process.platform,
      },
      cacheStatus: {
        gradle: env.CACHE_HIT_GRADLE === 'true' ? 'hit' : 'miss',
        cocoapods: env.CACHE_HIT_COCOAPODS === 'true' ? 'hit' : 'miss',
        nodeModules: env.CACHE_HIT_NODE_MODULES === 'true' ? 'hit' : 'miss',
      },
    };
  }

  /**
   * Analyze build logs for error patterns
   */
  analyzeBuildLogs(logs) {
    const platform = this.buildContext.buildMatrix.platform;

    // Android error patterns
    if (platform === 'android' || platform === 'cross-platform') {
      if (logs.includes('FAILURE: Build failed with an exception')) {
        return {
          errorType: 'gradle_build_failure',
          message: this.extractGradleErrorMessage(logs),
          affectedFiles: this.extractAffectedFiles(logs, [
            '*.gradle',
            '*.kt',
            '*.java',
          ]),
        };
      }

      if (logs.includes('Could not resolve all dependencies')) {
        return {
          errorType: 'gradle_dependency_conflict',
          message: 'Gradle dependency resolution failed',
          affectedFiles: ['build.gradle', 'settings.gradle'],
        };
      }
    }

    // iOS error patterns
    if (platform === 'ios' || platform === 'cross-platform') {
      if (logs.includes('pod install') && logs.includes('error')) {
        return {
          errorType: 'cocoapods_install_failure',
          message: this.extractCocoaPodsErrorMessage(logs),
          affectedFiles: ['Podfile', '*.podspec'],
        };
      }

      if (logs.includes('xcodebuild') && logs.includes('BUILD FAILED')) {
        return {
          errorType: 'xcode_build_failure',
          message: this.extractXcodeBuildErrorMessage(logs),
          affectedFiles: ['*.swift', '*.m', '*.h'],
        };
      }

      // Additional iOS error patterns
      if (logs.includes('Command PhaseScriptExecution failed')) {
        return {
          errorType: 'xcode_script_failure',
          message: 'Xcode script phase execution failed',
          affectedFiles: ['.xcode.env', '.xcode.env.local'],
        };
      }

      if (
        logs.includes('node: command not found') ||
        logs.includes('NODE_BINARY')
      ) {
        return {
          errorType: 'node_path_error',
          message: 'Node.js path configuration error',
          affectedFiles: ['.xcode.env', '.xcode.env.local'],
        };
      }

      if (logs.includes('Unable to find a specification')) {
        return {
          errorType: 'podspec_not_found',
          message: 'CocoaPods specification not found',
          affectedFiles: ['Podfile', '*.podspec'],
        };
      }
    }

    // Cross-platform error patterns
    if (logs.includes('codegen') && logs.includes('error')) {
      return {
        errorType: 'codegen_failure',
        message: 'React Native Codegen failed',
        affectedFiles: ['specs/*.ts', 'package.json'],
      };
    }

    if (logs.includes('ENOENT') || logs.includes('MODULE_NOT_FOUND')) {
      return {
        errorType: 'node_modules_corruption',
        message: 'Node modules corruption detected',
        affectedFiles: ['package.json', 'yarn.lock', 'node_modules/'],
      };
    }

    return null;
  }

  /**
   * Get recovery actions for error type
   */
  getRecoveryActions(errorType) {
    const recoveryStrategies = {
      gradle_build_failure: [
        {
          description: 'Clean Gradle cache and rebuild',
          priority: 'high',
          successRate: 0.85,
          commands: [
            'cd android',
            './gradlew clean',
            './gradlew build --refresh-dependencies',
          ],
        },
      ],
      cocoapods_install_failure: [
        {
          description: 'Clean CocoaPods cache and reinstall',
          priority: 'high',
          successRate: 0.9,
          commands: [
            'cd ios',
            'pod cache clean --all',
            'rm -rf Pods Podfile.lock',
            'pod install --repo-update',
          ],
        },
        {
          description: 'Reset CocoaPods specs and reinstall',
          priority: 'medium',
          successRate: 0.8,
          commands: [
            'cd ios',
            'pod repo remove trunk',
            'pod setup',
            'rm -rf Pods Podfile.lock',
            'pod install --repo-update --verbose',
          ],
        },
      ],
      xcode_build_failure: [
        {
          description: 'Clean Xcode build cache and rebuild',
          priority: 'high',
          successRate: 0.85,
          commands: [
            'cd ios',
            'rm -rf build DerivedData',
            'xcodebuild clean -workspace *.xcworkspace -scheme *',
            'xcodebuild -workspace *.xcworkspace -scheme * -configuration Release -sdk iphonesimulator',
          ],
        },
        {
          description: 'Reset Xcode environment and rebuild',
          priority: 'medium',
          successRate: 0.75,
          commands: [
            'cd ios',
            'rm -rf build DerivedData',
            'export NODE_BINARY=$(command -v node)',
            'echo "NODE_BINARY=$(command -v node)" > .xcode.env.local',
            'xcodebuild -workspace *.xcworkspace -scheme * -configuration Release -sdk iphonesimulator',
          ],
        },
      ],
      codegen_failure: [
        {
          description: 'Clean and regenerate Codegen files',
          priority: 'high',
          successRate: 0.85,
          commands: [
            'rm -rf node_modules/.cache',
            'yarn install',
            'npx react-native codegen',
          ],
        },
      ],
      node_modules_corruption: [
        {
          description: 'Reinstall Node modules',
          priority: 'high',
          successRate: 0.95,
          commands: ['rm -rf node_modules', 'yarn install'],
        },
      ],
      xcode_script_failure: [
        {
          description: 'Fix Xcode script environment',
          priority: 'high',
          successRate: 0.9,
          commands: [
            'cd ios',
            'echo "export NODE_BINARY=$(command -v node)" > .xcode.env.local',
            'echo "export RCT_NEW_ARCH_ENABLED=${RCT_NEW_ARCH_ENABLED:-0}" >> .xcode.env.local',
          ],
        },
      ],
      node_path_error: [
        {
          description: 'Fix Node.js path configuration',
          priority: 'high',
          successRate: 0.95,
          commands: [
            'cd ios',
            'echo "export NODE_BINARY=$(command -v node)" > .xcode.env.local',
            'which node',
            'node --version',
          ],
        },
      ],
      podspec_not_found: [
        {
          description: 'Update CocoaPods repository and retry',
          priority: 'high',
          successRate: 0.85,
          commands: [
            'cd ios',
            'pod repo update',
            'pod install --repo-update --verbose',
          ],
        },
      ],
    };

    return recoveryStrategies[errorType] || [];
  }

  /**
   * Apply recovery actions automatically
   */
  async applyRecoveryActions() {
    console.log('🔧 Applying automatic recovery actions...');

    // Clear caches
    const cacheCommands = [
      'rm -rf ~/.gradle/caches/transforms-*',
      'rm -rf ~/Library/Caches/CocoaPods',
      'yarn cache clean',
    ];

    for (const command of cacheCommands) {
      try {
        execSync(command, { stdio: 'pipe' });
        console.log(`✅ Executed: ${command}`);
      } catch (error) {
        console.log(`⚠️ Failed to execute: ${command}`);
      }
    }
  }

  // Health check methods
  async checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    const expectedMajor = 18;

    return {
      status: major >= expectedMajor ? 'healthy' : 'warning',
      message: `Node.js ${version} (expected: ${expectedMajor}+)`,
      recommendations: major < expectedMajor ? ['Upgrade Node.js'] : [],
    };
  }

  async checkDependencies() {
    const criticalDeps = ['react-native', 'typescript', 'vitest'];
    const missingDeps = [];

    for (const dep of criticalDeps) {
      try {
        require.resolve(dep);
      } catch {
        missingDeps.push(dep);
      }
    }

    // Check if we're in a pre-install phase (node_modules doesn't exist or is empty)
    const nodeModulesExists = fs.existsSync(
      path.join(process.cwd(), 'node_modules')
    );
    const isPreInstall =
      !nodeModulesExists || missingDeps.length === criticalDeps.length;

    return {
      status:
        missingDeps.length === 0
          ? 'healthy'
          : isPreInstall
          ? 'warning'
          : 'critical',
      message:
        missingDeps.length === 0
          ? 'All dependencies available'
          : isPreInstall
          ? `Pre-install phase: ${missingDeps.join(', ')} will be installed`
          : `Missing: ${missingDeps.join(', ')}`,
      recommendations:
        missingDeps.length > 0 && !isPreInstall ? ['Run yarn install'] : [],
    };
  }

  async checkBuildTools() {
    const tools = [];

    // Check Java
    try {
      const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
      tools.push(`Java: ${javaVersion.split('\n')[0]}`);
    } catch {
      tools.push('Java: Not found');
    }

    // Check Android SDK (if Android platform)
    if (this.buildContext.buildMatrix.platform === 'android') {
      const androidHome =
        process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      tools.push(`Android SDK: ${androidHome ? 'Found' : 'Not configured'}`);
    }

    return {
      status: 'healthy',
      message: tools.join(', '),
      recommendations: [],
    };
  }

  async checkCacheStatus() {
    const cacheStatus = this.buildContext.cacheStatus;
    const hits = Object.values(cacheStatus).filter(
      (status) => status === 'hit'
    ).length;
    const total = Object.keys(cacheStatus).length;
    const hitRate = total > 0 ? hits / total : 0;

    return {
      status: hitRate > 0.5 ? 'healthy' : 'warning',
      message: `Cache hit rate: ${Math.round(
        hitRate * 100
      )}% (${hits}/${total})`,
      recommendations: hitRate < 0.5 ? ['Review cache configuration'] : [],
    };
  }

  async checkEnvironment() {
    const requiredEnvVars = ['NODE_VERSION', 'CI'];
    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    return {
      status: missingVars.length === 0 ? 'healthy' : 'warning',
      message:
        missingVars.length === 0
          ? 'Environment configured'
          : `Missing: ${missingVars.join(', ')}`,
      recommendations:
        missingVars.length > 0 ? ['Set missing environment variables'] : [],
    };
  }

  // Utility methods
  extractGradleErrorMessage(logs) {
    const match = logs.match(
      /FAILURE: Build failed with an exception\.\s*\* What went wrong:\s*(.+?)(?:\n|$)/
    );
    return match ? match[1].trim() : 'Gradle build failed';
  }

  extractCocoaPodsErrorMessage(logs) {
    const match = logs.match(/\[!\]\s*(.+?)(?:\n|$)/);
    return match ? match[1].trim() : 'CocoaPods installation failed';
  }

  extractXcodeBuildErrorMessage(logs) {
    const match = logs.match(/error:\s*(.+?)(?:\n|$)/);
    return match ? match[1].trim() : 'Xcode build failed';
  }

  extractAffectedFiles(logs, patterns) {
    const files = [];
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

    return [...new Set(files)];
  }

  formatCacheStatus() {
    const cacheStatus = this.buildContext.cacheStatus;
    return Object.entries(cacheStatus)
      .map(([cache, cacheStatusValue]) => `- ${cache}: ${cacheStatusValue}`)
      .join('\n');
  }

  generateRecommendations() {
    const recommendations = [
      '- Monitor cache hit rates and optimize cache keys',
      '- Use parallel builds for different platforms',
      '- Implement retry logic for transient failures',
      '- Set up notifications for build failures',
    ];

    const cacheHitRate =
      Object.values(this.buildContext.cacheStatus).filter((s) => s === 'hit')
        .length / Object.keys(this.buildContext.cacheStatus).length;

    if (cacheHitRate < 0.7) {
      recommendations.push('- Review and optimize cache configuration');
    }

    return recommendations;
  }

  generateHealthReport(results) {
    const report = [
      '# CI Pipeline Health Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Health Check Results',
      '',
    ];

    results.forEach((result) => {
      const statusIcon =
        result.status === 'healthy'
          ? '✅'
          : result.status === 'warning'
          ? '⚠️'
          : '❌';
      report.push(`### ${statusIcon} ${result.name}`);
      report.push(`**Status:** ${result.status}`);
      report.push(`**Message:** ${result.message}`);

      if (result.recommendations && result.recommendations.length > 0) {
        report.push('**Recommendations:**');
        result.recommendations.forEach((rec) => report.push(`- ${rec}`));
      }
      report.push('');
    });

    return report.join('\n');
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  showUsage() {
    console.log(`
Usage: node scripts/ci-error-handler.js <command> [options]

Commands:
  monitor <build-command>     Monitor build execution and handle errors
  diagnose [log-file]         Diagnose build failure from logs
  health-check               Run comprehensive health checks
  report                     Generate CI pipeline report
  retry <max-retries> <cmd>  Retry failed build with recovery actions

Examples:
  node scripts/ci-error-handler.js monitor "npm run build"
  node scripts/ci-error-handler.js diagnose ci-build.log
  node scripts/ci-error-handler.js health-check
  node scripts/ci-error-handler.js retry 3 "npm run build"
`);
  }

  async analyzeBuildFailure(exitCode, buildOutput, buildDuration) {
    console.log(`\n🔍 Analyzing build failure (exit code: ${exitCode})`);

    const errorAnalysis = this.analyzeBuildLogs(buildOutput);

    if (errorAnalysis) {
      console.log(`Error Type: ${errorAnalysis.errorType}`);
      console.log(`Message: ${errorAnalysis.message}`);

      // Get recovery actions
      const recoveryActions = this.getRecoveryActions(errorAnalysis.errorType);

      if (recoveryActions.length > 0) {
        console.log('\n💡 Recommended Recovery Actions:');
        recoveryActions.slice(0, 2).forEach((action, index) => {
          console.log(
            `${index + 1}. ${action.description} (${Math.round(
              action.successRate * 100
            )}% success rate)`
          );
        });
      }

      // Check if retry is recommended
      const retryableErrors = [
        'gradle_build_failure',
        'cocoapods_install_failure',
        'node_modules_corruption',
      ];
      if (retryableErrors.includes(errorAnalysis.errorType)) {
        console.log('\n🔄 This error type supports automatic retry');
        console.log(
          'Use: node scripts/ci-error-handler.js retry 3 "<your-build-command>"'
        );
      }
    }

    // Generate error report
    const errorReport = [
      '# Build Failure Report',
      `Timestamp: ${new Date().toISOString()}`,
      `Duration: ${Math.round(buildDuration / 1000)}s`,
      `Exit Code: ${exitCode}`,
      '',
      '## Error Analysis',
      errorAnalysis
        ? `Type: ${errorAnalysis.errorType}`
        : 'No specific error pattern detected',
      errorAnalysis ? `Message: ${errorAnalysis.message}` : '',
      errorAnalysis && errorAnalysis.affectedFiles.length > 0
        ? `Affected Files: ${errorAnalysis.affectedFiles.join(', ')}`
        : '',
      '',
      '## Build Context',
      `Platform: ${this.buildContext.buildMatrix.platform}`,
      `Architecture: ${this.buildContext.buildMatrix.architecture}`,
      `RN Version: ${this.buildContext.buildMatrix.rnVersion}`,
      '',
      '## Build Output',
      '```',
      buildOutput.slice(-2000), // Last 2000 characters
      '```',
    ]
      .filter((line) => line !== '')
      .join('\n');

    fs.writeFileSync(this.errorReportFile, errorReport);
    console.log(`\n📄 Error report saved to ${this.errorReportFile}`);
  }

  async recordBuildSuccess(buildDuration) {
    console.log(
      `✅ Build completed successfully in ${Math.round(buildDuration / 1000)}s`
    );

    // Record success metrics
    const successReport = [
      '# Build Success Report',
      `Timestamp: ${new Date().toISOString()}`,
      `Duration: ${Math.round(buildDuration / 1000)}s`,
      '',
      '## Build Context',
      `Platform: ${this.buildContext.buildMatrix.platform}`,
      `Architecture: ${this.buildContext.buildMatrix.architecture}`,
      `RN Version: ${this.buildContext.buildMatrix.rnVersion}`,
      '',
      '## Cache Performance',
      this.formatCacheStatus(),
    ].join('\n');

    fs.writeFileSync('ci-success-report.md', successReport);
  }
}

// Run the script
if (require.main === module) {
  const handler = new CIErrorHandlerScript();
  handler.run().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = CIErrorHandlerScript;
