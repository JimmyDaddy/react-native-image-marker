#!/usr/bin/env node

/**
 * Unified Architecture Management Tool
 *
 * This script provides a unified interface to manage architecture across all example apps.
 * Supports batch operations, status checking, and validation.
 *
 * Usage:
 *   node scripts/manage-architecture.js <command> [options]
 *
 * Commands:
 *   status              - Show architecture status for all apps
 *   switch <arch>       - Switch all apps to specified architecture
 *   validate            - Validate architecture configuration consistency
 *   help                - Show this help message
 *
 * Examples:
 *   node scripts/manage-architecture.js status
 *   node scripts/manage-architecture.js switch new
 *   node scripts/manage-architecture.js switch legacy
 *   node scripts/manage-architecture.js validate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logHeader(message) {
  log(`\n${'═'.repeat(60)}`, 'bright');
  log(message, 'bright');
  log('═'.repeat(60), 'bright');
}

const EXAMPLE_APPS = [
  {
    name: 'example',
    path: 'example',
    type: 'react-native',
    platforms: ['android', 'ios'],
  },
  {
    name: 'example-0.73',
    path: 'example-0.73',
    type: 'react-native',
    platforms: ['android', 'ios'],
  },
  {
    name: 'example-0.81',
    path: 'example-0.81',
    type: 'react-native',
    platforms: ['android', 'ios'],
    optional: true, // May not exist yet
  },
  {
    name: 'expo-example',
    path: 'expo-example',
    type: 'expo',
    platforms: ['android', 'ios'],
  },
];

/**
 * Check if an app exists
 */
function appExists(appPath) {
  return fs.existsSync(appPath);
}

/**
 * Get architecture status for all apps
 */
function getStatusForAllApps() {
  const results = {};

  for (const app of EXAMPLE_APPS) {
    if (app.optional && !appExists(app.path)) {
      results[app.name] = {
        exists: false,
        status: 'not_created',
      };
      continue;
    }

    if (!appExists(app.path)) {
      results[app.name] = {
        exists: false,
        status: 'missing',
      };
      continue;
    }

    results[app.name] = {
      exists: true,
      type: app.type,
      platforms: {},
    };

    // Check Android
    if (app.platforms.includes('android')) {
      const gradlePropsPath = path.join(
        app.path,
        'android',
        'gradle.properties'
      );
      if (fs.existsSync(gradlePropsPath)) {
        const content = fs.readFileSync(gradlePropsPath, 'utf8');
        const match = content.match(/newArchEnabled\s*=\s*(true|false)/);
        results[app.name].platforms.android = match
          ? match[1] === 'true'
            ? 'new'
            : 'legacy'
          : 'not_configured';
      } else {
        results[app.name].platforms.android = 'not_found';
      }
    }

    // Check iOS
    if (app.platforms.includes('ios')) {
      if (app.type === 'expo') {
        // For Expo, check app.json
        const appJsonPath = path.join(app.path, 'app.json');
        if (fs.existsSync(appJsonPath)) {
          try {
            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            let configured = false;

            if (appJson.expo && appJson.expo.plugins) {
              for (const plugin of appJson.expo.plugins) {
                if (
                  Array.isArray(plugin) &&
                  plugin[0] === 'react-native-image-marker'
                ) {
                  const config = plugin[1];
                  const isNewArch = config && config.newArchEnabled === true;
                  results[app.name].platforms.ios = isNewArch
                    ? 'new'
                    : 'legacy';
                  configured = true;
                  break;
                }
              }
            }

            if (!configured) {
              results[app.name].platforms.ios = 'not_configured';
            }
          } catch (error) {
            results[app.name].platforms.ios = 'error';
          }
        } else {
          results[app.name].platforms.ios = 'not_found';
        }
      } else {
        // For React Native, check Podfile
        const podfilePath = path.join(app.path, 'ios', 'Podfile');
        if (fs.existsSync(podfilePath)) {
          const content = fs.readFileSync(podfilePath, 'utf8');
          const match = content.match(
            /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"]?(1|0|true|false)['"]?/
          );
          if (match) {
            const value = match[1];
            const isNewArch = value === '1' || value === 'true';
            results[app.name].platforms.ios = isNewArch ? 'new' : 'legacy';
          } else {
            results[app.name].platforms.ios = 'not_configured';
          }
        } else {
          results[app.name].platforms.ios = 'not_found';
        }
      }
    }
  }

  return results;
}

/**
 * Display status for all apps
 */
function displayStatus() {
  logHeader('Architecture Status for All Example Apps');

  const results = getStatusForAllApps();

  for (const app of EXAMPLE_APPS) {
    const result = results[app.name];

    log(`\n${app.name}:`, 'bright');

    if (!result.exists) {
      if (result.status === 'not_created') {
        logWarning(`  Not created yet (optional)`);
        log(`  Run: ./scripts/create-${app.name}.sh`, 'dim');
      } else {
        logError(`  Missing!`);
      }
      continue;
    }

    // Display platform status
    for (const platform of app.platforms) {
      const status = result.platforms[platform];
      let icon, color, text;

      switch (status) {
        case 'new':
          icon = '✓';
          color = 'cyan';
          text = 'New Architecture';
          break;
        case 'legacy':
          icon = '○';
          color = 'green';
          text = 'Legacy Architecture';
          break;
        case 'not_configured':
          icon = '⚠';
          color = 'yellow';
          text = 'Not configured';
          break;
        case 'not_found':
          icon = '⚠';
          color = 'yellow';
          text = 'Configuration file not found';
          break;
        case 'error':
          icon = '✗';
          color = 'red';
          text = 'Error reading configuration';
          break;
        default:
          icon = '?';
          color = 'reset';
          text = 'Unknown';
      }

      log(`  ${icon} ${platform}: ${text}`, color);
    }

    // Check consistency
    const platforms = Object.values(result.platforms);
    const configured = platforms.filter((p) => p === 'new' || p === 'legacy');
    if (configured.length > 1) {
      const allSame = configured.every((p) => p === configured[0]);
      if (!allSame) {
        logWarning(`  ⚠ Inconsistent configuration across platforms!`);
      }
    }
  }

  // Summary
  logHeader('Summary');

  log('\nLegend:');
  log('  ✓ = New Architecture', 'cyan');
  log('  ○ = Legacy Architecture', 'green');
  log('  ⚠ = Not configured or not found', 'yellow');
  log('  ✗ = Error', 'red');

  log('\nCommands:');
  log('  Switch all to New Architecture:');
  log('    node scripts/manage-architecture.js switch new', 'dim');
  log('  Switch all to Legacy Architecture:');
  log('    node scripts/manage-architecture.js switch legacy', 'dim');
  log('  Validate configuration:');
  log('    node scripts/manage-architecture.js validate', 'dim');
}

/**
 * Switch all apps to specified architecture
 */
function switchAllApps(architecture) {
  if (architecture !== 'legacy' && architecture !== 'new') {
    logError('Invalid architecture. Must be "legacy" or "new"');
    process.exit(1);
  }

  logHeader(`Switching All Apps to ${architecture.toUpperCase()} Architecture`);

  const results = {
    success: [],
    failed: [],
    skipped: [],
  };

  for (const app of EXAMPLE_APPS) {
    log(`\n${'─'.repeat(60)}`, 'bright');
    log(`Processing: ${app.name}`, 'bright');
    log('─'.repeat(60), 'bright');

    if (app.optional && !appExists(app.path)) {
      logWarning(`Skipping ${app.name} (not created yet)`);
      results.skipped.push(app.name);
      continue;
    }

    if (!appExists(app.path)) {
      logError(`Skipping ${app.name} (missing)`);
      results.failed.push(app.name);
      continue;
    }

    try {
      if (app.type === 'expo') {
        // Use Expo-specific script
        execSync(`node scripts/switch-expo-architecture.js ${architecture}`, {
          stdio: 'inherit',
        });
      } else {
        // Use React Native script
        execSync(
          `node scripts/switch-architecture.js ${architecture} ${app.name}`,
          {
            stdio: 'inherit',
          }
        );
      }

      results.success.push(app.name);
    } catch (error) {
      logError(`Failed to switch ${app.name}`);
      results.failed.push(app.name);
    }
  }

  // Summary
  logHeader('Batch Switch Summary');

  if (results.success.length > 0) {
    logSuccess(`\nSuccessfully switched (${results.success.length}):`);
    results.success.forEach((name) => log(`  ✓ ${name}`, 'green'));
  }

  if (results.skipped.length > 0) {
    logWarning(`\nSkipped (${results.skipped.length}):`);
    results.skipped.forEach((name) => log(`  ⊘ ${name}`, 'yellow'));
  }

  if (results.failed.length > 0) {
    logError(`\nFailed (${results.failed.length}):`);
    results.failed.forEach((name) => log(`  ✗ ${name}`, 'red'));
  }

  log('');

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

/**
 * Validate architecture configuration consistency
 */
function validateConfiguration() {
  logHeader('Validating Architecture Configuration');

  const results = getStatusForAllApps();
  const issues = [];

  for (const app of EXAMPLE_APPS) {
    const result = results[app.name];

    if (!result.exists) {
      if (!app.optional) {
        issues.push({
          app: app.name,
          type: 'missing',
          message: 'App directory not found',
        });
      }
      continue;
    }

    // Check if all platforms are configured
    for (const platform of app.platforms) {
      const status = result.platforms[platform];

      if (status === 'not_configured' || status === 'not_found') {
        issues.push({
          app: app.name,
          platform,
          type: 'not_configured',
          message: `${platform} not configured`,
        });
      } else if (status === 'error') {
        issues.push({
          app: app.name,
          platform,
          type: 'error',
          message: `Error reading ${platform} configuration`,
        });
      }
    }

    // Check consistency across platforms
    const platforms = Object.entries(result.platforms);
    const configured = platforms.filter(
      ([_, status]) => status === 'new' || status === 'legacy'
    );

    if (configured.length > 1) {
      const architectures = configured.map(([_, status]) => status);
      const allSame = architectures.every((arch) => arch === architectures[0]);

      if (!allSame) {
        issues.push({
          app: app.name,
          type: 'inconsistent',
          message: 'Inconsistent architecture across platforms',
          details: platforms
            .map(([platform, status]) => `${platform}: ${status}`)
            .join(', '),
        });
      }
    }
  }

  // Display results
  if (issues.length === 0) {
    logSuccess('\n✓ All configurations are valid and consistent!');
  } else {
    logWarning(`\n⚠ Found ${issues.length} issue(s):\n`);

    issues.forEach((issue, index) => {
      log(`${index + 1}. ${issue.app}`, 'yellow');
      log(`   Type: ${issue.type}`, 'dim');
      log(`   Message: ${issue.message}`, 'dim');
      if (issue.details) {
        log(`   Details: ${issue.details}`, 'dim');
      }
      if (issue.platform) {
        log(`   Platform: ${issue.platform}`, 'dim');
      }
      log('');
    });

    log('Recommendations:', 'bright');
    log('  1. Run: node scripts/manage-architecture.js switch <legacy|new>');
    log('  2. Or fix individual apps using:');
    log('     node scripts/switch-architecture.js <legacy|new> <app-name>');
    log('     node scripts/switch-expo-architecture.js <legacy|new>');
  }

  return issues.length === 0;
}

/**
 * Show help message
 */
function showHelp() {
  log('\nUnified Architecture Management Tool', 'bright');
  log('====================================\n', 'bright');

  log('Usage: node scripts/manage-architecture.js <command> [options]\n');

  log('Commands:', 'bright');
  log('  status              Show architecture status for all apps');
  log('  switch <arch>       Switch all apps to specified architecture');
  log('                      <arch> can be "legacy" or "new"');
  log('  validate            Validate architecture configuration consistency');
  log('  help                Show this help message\n');

  log('Examples:', 'bright');
  log('  node scripts/manage-architecture.js status');
  log('  node scripts/manage-architecture.js switch new');
  log('  node scripts/manage-architecture.js switch legacy');
  log('  node scripts/manage-architecture.js validate\n');

  log('Individual App Management:', 'bright');
  log('  React Native apps:');
  log('    node scripts/switch-architecture.js <legacy|new> <app-name>');
  log('  Expo app:');
  log('    node scripts/switch-expo-architecture.js <legacy|new>\n');

  log('Available Apps:', 'bright');
  EXAMPLE_APPS.forEach((app) => {
    const optional = app.optional ? ' (optional)' : '';
    log(`  - ${app.name} (${app.type})${optional}`);
  });
  log('');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === 'help' ||
    args[0] === '--help' ||
    args[0] === '-h'
  ) {
    showHelp();
    return;
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case 'status':
      displayStatus();
      break;

    case 'switch':
      if (args.length < 2) {
        logError('Missing architecture argument');
        log('Usage: node scripts/manage-architecture.js switch <legacy|new>');
        process.exit(1);
      }
      switchAllApps(args[1]);
      break;

    case 'validate':
      const isValid = validateConfiguration();
      process.exit(isValid ? 0 : 1);
      break;

    default:
      logError(`Unknown command: ${command}`);
      log(
        'Run "node scripts/manage-architecture.js help" for usage information'
      );
      process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getStatusForAllApps,
  displayStatus,
  switchAllApps,
  validateConfiguration,
};
