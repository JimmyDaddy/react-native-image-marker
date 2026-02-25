#!/usr/bin/env node

/**
 * Architecture Status Checker
 *
 * This script checks the current architecture configuration across all example apps.
 *
 * Usage:
 *   node scripts/check-architecture.js [app-path]
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const EXAMPLE_APPS = [
  {
    name: 'example',
    path: 'example',
    platforms: ['android', 'ios'],
  },
  {
    name: 'example-0.73',
    path: 'example-0.73',
    platforms: ['android', 'ios'],
  },
  {
    name: 'example-0.81',
    path: 'example-0.81',
    platforms: ['android', 'ios'],
  },
  {
    name: 'expo-example',
    path: 'expo-example',
    platforms: ['android', 'ios'],
  },
];

function checkAndroidArchitecture(appPath) {
  const gradlePropsPath = path.join(appPath, 'android', 'gradle.properties');

  if (!fs.existsSync(gradlePropsPath)) {
    return { status: 'not_found', value: null };
  }

  try {
    const content = fs.readFileSync(gradlePropsPath, 'utf8');
    const match = content.match(/newArchEnabled\s*=\s*(true|false)/);

    if (match) {
      const isNewArch = match[1] === 'true';
      return {
        status: 'configured',
        value: isNewArch ? 'new' : 'legacy',
        raw: match[1],
      };
    }

    return { status: 'not_configured', value: null };
  } catch (error) {
    return { status: 'error', value: null, error: error.message };
  }
}

function checkIOSArchitecture(appPath) {
  const podfilePath = path.join(appPath, 'ios', 'Podfile');
  const xcodeEnvPath = path.join(appPath, 'ios', '.xcode.env.local');

  const result = {
    podfile: { status: 'not_found', value: null },
    xcodeEnv: { status: 'not_found', value: null },
  };

  // Check Podfile
  if (fs.existsSync(podfilePath)) {
    try {
      const content = fs.readFileSync(podfilePath, 'utf8');
      const match = content.match(
        /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"]?(1|0|true|false)['"]?/
      );

      if (match) {
        const value = match[1];
        const isNewArch = value === '1' || value === 'true';
        result.podfile = {
          status: 'configured',
          value: isNewArch ? 'new' : 'legacy',
          raw: value,
        };
      } else {
        result.podfile = { status: 'not_configured', value: null };
      }
    } catch (error) {
      result.podfile = { status: 'error', value: null, error: error.message };
    }
  }

  // Check .xcode.env.local
  if (fs.existsSync(xcodeEnvPath)) {
    try {
      const content = fs.readFileSync(xcodeEnvPath, 'utf8');
      const match = content.match(/export\s+RCT_NEW_ARCH_ENABLED\s*=\s*(1|0)/);

      if (match) {
        const isNewArch = match[1] === '1';
        result.xcodeEnv = {
          status: 'configured',
          value: isNewArch ? 'new' : 'legacy',
          raw: match[1],
        };
      } else {
        result.xcodeEnv = { status: 'not_configured', value: null };
      }
    } catch (error) {
      result.xcodeEnv = { status: 'error', value: null, error: error.message };
    }
  }

  return result;
}

function getStatusIcon(status, value) {
  if (status === 'not_found') return '⚠';
  if (status === 'not_configured') return '⚠';
  if (status === 'error') return '✗';
  if (value === 'new') return '✓';
  if (value === 'legacy') return '○';
  return '?';
}

function getStatusColor(status, value) {
  if (status === 'not_found') return 'yellow';
  if (status === 'not_configured') return 'yellow';
  if (status === 'error') return 'red';
  if (value === 'new') return 'cyan';
  if (value === 'legacy') return 'green';
  return 'reset';
}

function checkApp(appConfig) {
  const { name, path: appPath, platforms } = appConfig;

  log(`\n${'─'.repeat(60)}`, 'bright');
  log(`${name}`, 'bright');
  log('─'.repeat(60), 'bright');

  const results = {};

  // Check Android
  if (platforms.includes('android')) {
    const android = checkAndroidArchitecture(appPath);
    results.android = android;

    const icon = getStatusIcon(android.status, android.value);
    const color = getStatusColor(android.status, android.value);
    const statusText = android.value || android.status.replace('_', ' ');

    log(`  ${icon} Android: ${statusText}`, color);

    if (android.status === 'error') {
      log(`    Error: ${android.error}`, 'red');
    }
  }

  // Check iOS
  if (platforms.includes('ios')) {
    const ios = checkIOSArchitecture(appPath);
    results.ios = ios;

    // Podfile
    const podfileIcon = getStatusIcon(ios.podfile.status, ios.podfile.value);
    const podfileColor = getStatusColor(ios.podfile.status, ios.podfile.value);
    const podfileText =
      ios.podfile.value || ios.podfile.status.replace('_', ' ');
    log(`  ${podfileIcon} iOS (Podfile): ${podfileText}`, podfileColor);

    if (ios.podfile.status === 'error') {
      log(`    Error: ${ios.podfile.error}`, 'red');
    }

    // .xcode.env.local
    const xcodeIcon = getStatusIcon(ios.xcodeEnv.status, ios.xcodeEnv.value);
    const xcodeColor = getStatusColor(ios.xcodeEnv.status, ios.xcodeEnv.value);
    const xcodeText =
      ios.xcodeEnv.value || ios.xcodeEnv.status.replace('_', ' ');
    log(`  ${xcodeIcon} iOS (.xcode.env.local): ${xcodeText}`, xcodeColor);

    if (ios.xcodeEnv.status === 'error') {
      log(`    Error: ${ios.xcodeEnv.error}`, 'red');
    }

    // Check consistency
    if (
      ios.podfile.value &&
      ios.xcodeEnv.value &&
      ios.podfile.value !== ios.xcodeEnv.value
    ) {
      log(`  ⚠ Warning: iOS configuration mismatch!`, 'yellow');
    }
  }

  return results;
}

function main() {
  const args = process.argv.slice(2);
  const targetApp = args[0];

  log(
    '\n╔═══════════════════════════════════════════════════════════╗',
    'bright'
  );
  log('║     React Native Architecture Status Checker             ║', 'bright');
  log(
    '╚═══════════════════════════════════════════════════════════╝',
    'bright'
  );

  let appsToCheck = EXAMPLE_APPS;

  if (targetApp) {
    const app = EXAMPLE_APPS.find(
      (a) => a.name === targetApp || a.path === targetApp
    );
    if (!app) {
      log(`\nApp not found: ${targetApp}`, 'red');
      log('\nAvailable apps:');
      EXAMPLE_APPS.forEach((a) => log(`  - ${a.name}`));
      process.exit(1);
    }
    appsToCheck = [app];
  }

  const allResults = {};
  for (const app of appsToCheck) {
    allResults[app.name] = checkApp(app);
  }

  // Summary
  log(`\n${'═'.repeat(60)}`, 'bright');
  log('Summary', 'bright');
  log('═'.repeat(60), 'bright');

  log('\nLegend:');
  log('  ✓ = New Architecture enabled', 'cyan');
  log('  ○ = Legacy Architecture', 'green');
  log('  ⚠ = Not configured or not found', 'yellow');
  log('  ✗ = Error', 'red');

  log('\nTo switch architecture, run:');
  log('  node scripts/switch-architecture.js <legacy|new> [app-name]\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkAndroidArchitecture,
  checkIOSArchitecture,
  checkApp,
};
