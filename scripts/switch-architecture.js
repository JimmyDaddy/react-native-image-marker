#!/usr/bin/env node

/**
 * Cross-Platform Architecture Switcher
 *
 * This script switches between Legacy and New Architecture for React Native projects.
 * Supports Android and iOS platforms across multiple example apps.
 *
 * Usage:
 *   node scripts/switch-architecture.js <architecture> [app-path]
 *
 * Arguments:
 *   architecture: 'legacy' or 'new'
 *   app-path: Optional path to specific app (default: all example apps)
 *
 * Examples:
 *   node scripts/switch-architecture.js new
 *   node scripts/switch-architecture.js legacy example-0.73
 *   node scripts/switch-architecture.js new expo-example
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Configuration for example apps
const EXAMPLE_APPS = [
  {
    name: 'example',
    path: 'example',
    platforms: ['android', 'ios'],
    hasExpo: false,
  },
  {
    name: 'example-0.73',
    path: 'example-0.73',
    platforms: ['android', 'ios'],
    hasExpo: false,
  },
  {
    name: 'example-0.81',
    path: 'example-0.81',
    platforms: ['android', 'ios'],
    hasExpo: false,
  },
  {
    name: 'expo-example',
    path: 'expo-example',
    platforms: ['android', 'ios'],
    hasExpo: true,
  },
];

/**
 * Update Android gradle.properties file
 */
function updateAndroidGradleProperties(appPath, enableNewArch) {
  const gradlePropsPath = path.join(appPath, 'android', 'gradle.properties');

  if (!fs.existsSync(gradlePropsPath)) {
    logWarning(`Android gradle.properties not found: ${gradlePropsPath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(gradlePropsPath, 'utf8');

    // Update newArchEnabled property
    const newArchRegex = /newArchEnabled\s*=\s*(true|false)/;
    const newValue = `newArchEnabled=${enableNewArch}`;

    if (newArchRegex.test(content)) {
      content = content.replace(newArchRegex, newValue);
    } else {
      // Add the property if it doesn't exist
      content += `\n# React Native New Architecture\n${newValue}\n`;
    }

    fs.writeFileSync(gradlePropsPath, content, 'utf8');
    logSuccess(
      `Updated Android gradle.properties: newArchEnabled=${enableNewArch}`
    );
    return true;
  } catch (error) {
    logError(`Failed to update Android gradle.properties: ${error.message}`);
    return false;
  }
}

/**
 * Update iOS Podfile environment variable
 */
function updateIOSPodfile(appPath, enableNewArch) {
  const podfilePath = path.join(appPath, 'ios', 'Podfile');

  if (!fs.existsSync(podfilePath)) {
    logWarning(`iOS Podfile not found: ${podfilePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(podfilePath, 'utf8');

    // Check if RCT_NEW_ARCH_ENABLED is already set
    const envVarRegex =
      /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"]?(1|0|true|false)['"]?/;
    const newValue = enableNewArch ? '1' : '0';

    if (envVarRegex.test(content)) {
      content = content.replace(
        envVarRegex,
        `ENV['RCT_NEW_ARCH_ENABLED'] = '${newValue}'`
      );
    } else {
      // Add the environment variable before platform declaration
      const platformRegex = /(platform\s+:ios)/;
      if (platformRegex.test(content)) {
        content = content.replace(
          platformRegex,
          `# React Native New Architecture\nENV['RCT_NEW_ARCH_ENABLED'] = '${newValue}'\n\n$1`
        );
      } else {
        // Fallback: add at the beginning after require statements
        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('require')) {
            insertIndex = i + 1;
          }
        }
        lines.splice(
          insertIndex,
          0,
          `\n# React Native New Architecture\nENV['RCT_NEW_ARCH_ENABLED'] = '${newValue}'\n`
        );
        content = lines.join('\n');
      }
    }

    fs.writeFileSync(podfilePath, content, 'utf8');
    logSuccess(`Updated iOS Podfile: RCT_NEW_ARCH_ENABLED=${newValue}`);
    return true;
  } catch (error) {
    logError(`Failed to update iOS Podfile: ${error.message}`);
    return false;
  }
}

/**
 * Update iOS .xcode.env.local file
 */
function updateIOSXcodeEnv(appPath, enableNewArch) {
  const xcodeEnvPath = path.join(appPath, 'ios', '.xcode.env.local');
  const newValue = enableNewArch ? '1' : '0';

  try {
    let content = '';
    if (fs.existsSync(xcodeEnvPath)) {
      content = fs.readFileSync(xcodeEnvPath, 'utf8');
    }

    const envVarRegex = /export\s+RCT_NEW_ARCH_ENABLED\s*=\s*(1|0)/;
    const newLine = `export RCT_NEW_ARCH_ENABLED=${newValue}`;

    if (envVarRegex.test(content)) {
      content = content.replace(envVarRegex, newLine);
    } else {
      content += `\n# React Native New Architecture\n${newLine}\n`;
    }

    fs.writeFileSync(xcodeEnvPath, content, 'utf8');
    logSuccess(
      `Updated iOS .xcode.env.local: RCT_NEW_ARCH_ENABLED=${newValue}`
    );
    return true;
  } catch (error) {
    logError(`Failed to update iOS .xcode.env.local: ${error.message}`);
    return false;
  }
}

/**
 * Update Expo app configuration
 */
function updateExpoConfig(appPath, enableNewArch) {
  const appJsonPath = path.join(appPath, 'app.json');

  if (!fs.existsSync(appJsonPath)) {
    logWarning(`Expo app.json not found: ${appJsonPath}`);
    return false;
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    // Update newArchEnabled in expo config
    if (!appJson.expo) {
      appJson.expo = {};
    }
    if (!appJson.expo.plugins) {
      appJson.expo.plugins = [];
    }

    // Find or add react-native-image-marker plugin
    let pluginIndex = -1;
    for (let i = 0; i < appJson.expo.plugins.length; i++) {
      const plugin = appJson.expo.plugins[i];
      if (Array.isArray(plugin) && plugin[0] === 'react-native-image-marker') {
        pluginIndex = i;
        break;
      } else if (plugin === 'react-native-image-marker') {
        pluginIndex = i;
        break;
      }
    }

    if (pluginIndex >= 0) {
      appJson.expo.plugins[pluginIndex] = [
        'react-native-image-marker',
        { newArchEnabled: enableNewArch },
      ];
    } else {
      appJson.expo.plugins.push([
        'react-native-image-marker',
        { newArchEnabled: enableNewArch },
      ]);
    }

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
    logSuccess(`Updated Expo app.json: newArchEnabled=${enableNewArch}`);
    return true;
  } catch (error) {
    logError(`Failed to update Expo app.json: ${error.message}`);
    return false;
  }
}

/**
 * Check current architecture status
 */
function checkArchitectureStatus(appPath, platforms) {
  logInfo(`\nChecking architecture status for: ${appPath}`);

  const status = {
    android: null,
    ios: null,
  };

  // Check Android
  if (platforms.includes('android')) {
    const gradlePropsPath = path.join(appPath, 'android', 'gradle.properties');
    if (fs.existsSync(gradlePropsPath)) {
      const content = fs.readFileSync(gradlePropsPath, 'utf8');
      const match = content.match(/newArchEnabled\s*=\s*(true|false)/);
      if (match) {
        status.android = match[1] === 'true' ? 'new' : 'legacy';
        log(
          `  Android: ${status.android} architecture`,
          status.android === 'new' ? 'cyan' : 'yellow'
        );
      }
    }
  }

  // Check iOS
  if (platforms.includes('ios')) {
    const podfilePath = path.join(appPath, 'ios', 'Podfile');
    if (fs.existsSync(podfilePath)) {
      const content = fs.readFileSync(podfilePath, 'utf8');
      const match = content.match(
        /ENV\['RCT_NEW_ARCH_ENABLED'\]\s*=\s*['"]?(1|0|true|false)['"]?/
      );
      if (match) {
        const value = match[1];
        status.ios = value === '1' || value === 'true' ? 'new' : 'legacy';
        log(
          `  iOS: ${status.ios} architecture`,
          status.ios === 'new' ? 'cyan' : 'yellow'
        );
      }
    }
  }

  return status;
}

/**
 * Switch architecture for a specific app
 */
function switchArchitecture(appConfig, architecture) {
  const { name, path: appPath, platforms, hasExpo } = appConfig;
  const enableNewArch = architecture === 'new';

  log(`\n${'='.repeat(60)}`, 'bright');
  log(
    `Switching ${name} to ${architecture.toUpperCase()} architecture`,
    'bright'
  );
  log('='.repeat(60), 'bright');

  let success = true;

  // Update Android
  if (platforms.includes('android')) {
    logInfo('\nUpdating Android configuration...');
    if (!updateAndroidGradleProperties(appPath, enableNewArch)) {
      success = false;
    }
  }

  // Update iOS
  if (platforms.includes('ios')) {
    logInfo('\nUpdating iOS configuration...');
    if (!updateIOSPodfile(appPath, enableNewArch)) {
      success = false;
    }
    if (!updateIOSXcodeEnv(appPath, enableNewArch)) {
      success = false;
    }
  }

  // Update Expo if applicable
  if (hasExpo) {
    logInfo('\nUpdating Expo configuration...');
    if (!updateExpoConfig(appPath, enableNewArch)) {
      success = false;
    }
  }

  // Verify the changes
  checkArchitectureStatus(appPath, platforms);

  if (success) {
    logSuccess(
      `\n✓ Successfully switched ${name} to ${architecture} architecture`
    );

    // Provide next steps
    log('\nNext steps:', 'bright');
    if (platforms.includes('android')) {
      log('  Android: cd ' + appPath + ' && npm run android');
    }
    if (platforms.includes('ios')) {
      log('  iOS: cd ' + appPath + ' && npm run pods && npm run ios');
    }
  } else {
    logError(`\n✗ Failed to switch ${name} to ${architecture} architecture`);
  }

  return success;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('\nCross-Platform Architecture Switcher', 'bright');
    log('=====================================\n', 'bright');
    log(
      'Usage: node scripts/switch-architecture.js <architecture> [app-path]\n'
    );
    log('Arguments:');
    log('  architecture: "legacy" or "new"');
    log(
      '  app-path: Optional path to specific app (default: all example apps)\n'
    );
    log('Examples:');
    log('  node scripts/switch-architecture.js new');
    log('  node scripts/switch-architecture.js legacy example-0.73');
    log('  node scripts/switch-architecture.js new expo-example\n');
    log('Available apps:');
    EXAMPLE_APPS.forEach((app) => {
      log(`  - ${app.name} (${app.platforms.join(', ')})`);
    });
    process.exit(0);
  }

  const architecture = args[0].toLowerCase();
  const targetApp = args[1];

  if (architecture !== 'legacy' && architecture !== 'new') {
    logError('Invalid architecture. Must be "legacy" or "new"');
    process.exit(1);
  }

  let appsToUpdate = EXAMPLE_APPS;

  if (targetApp) {
    const app = EXAMPLE_APPS.find(
      (a) => a.name === targetApp || a.path === targetApp
    );
    if (!app) {
      logError(`App not found: ${targetApp}`);
      log('\nAvailable apps:');
      EXAMPLE_APPS.forEach((a) => log(`  - ${a.name}`));
      process.exit(1);
    }
    appsToUpdate = [app];
  }

  log('\nStarting architecture switch...', 'bright');
  log(`Target architecture: ${architecture.toUpperCase()}`, 'cyan');
  log(
    `Apps to update: ${appsToUpdate.map((a) => a.name).join(', ')}\n`,
    'cyan'
  );

  let allSuccess = true;
  for (const app of appsToUpdate) {
    if (!switchArchitecture(app, architecture)) {
      allSuccess = false;
    }
  }

  log('\n' + '='.repeat(60), 'bright');
  if (allSuccess) {
    logSuccess('All apps successfully updated!');
  } else {
    logError('Some apps failed to update. Please check the errors above.');
    process.exit(1);
  }
  log('='.repeat(60) + '\n', 'bright');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  switchArchitecture,
  checkArchitectureStatus,
  updateAndroidGradleProperties,
  updateIOSPodfile,
  updateIOSXcodeEnv,
  updateExpoConfig,
};
