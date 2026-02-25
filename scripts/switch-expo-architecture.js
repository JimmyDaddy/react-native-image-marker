#!/usr/bin/env node

/**
 * Expo Architecture Switcher
 *
 * This script switches between Legacy and New Architecture for Expo projects.
 * It updates the app.json configuration to use the appropriate settings.
 *
 * Usage:
 *   node scripts/switch-expo-architecture.js <architecture>
 *
 * Arguments:
 *   architecture: 'legacy' or 'new'
 *
 * Examples:
 *   node scripts/switch-expo-architecture.js new
 *   node scripts/switch-expo-architecture.js legacy
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

const EXPO_PATH = 'expo-example';

/**
 * Update Expo app.json configuration
 */
function updateExpoAppJson(enableNewArch) {
  const appJsonPath = path.join(EXPO_PATH, 'app.json');

  if (!fs.existsSync(appJsonPath)) {
    logError(`Expo app.json not found: ${appJsonPath}`);
    return false;
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    // Find react-native-image-marker plugin
    let pluginFound = false;
    if (appJson.expo && appJson.expo.plugins) {
      for (let i = 0; i < appJson.expo.plugins.length; i++) {
        const plugin = appJson.expo.plugins[i];

        if (
          Array.isArray(plugin) &&
          plugin[0] === 'react-native-image-marker'
        ) {
          // Update plugin configuration
          plugin[1] = {
            newArchEnabled: enableNewArch,
            enableFabric: enableNewArch,
            enableTurboModules: enableNewArch,
          };
          pluginFound = true;
          break;
        }
      }
    }

    if (!pluginFound) {
      logWarning('react-native-image-marker plugin not found in app.json');

      // Add the plugin
      if (!appJson.expo) {
        appJson.expo = {};
      }
      if (!appJson.expo.plugins) {
        appJson.expo.plugins = [];
      }

      appJson.expo.plugins.push([
        'react-native-image-marker',
        {
          newArchEnabled: enableNewArch,
          enableFabric: enableNewArch,
          enableTurboModules: enableNewArch,
        },
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
 * Update app.new-arch.json to ensure it has correct settings
 */
function updateExpoNewArchJson() {
  const newArchJsonPath = path.join(EXPO_PATH, 'app.new-arch.json');

  if (!fs.existsSync(newArchJsonPath)) {
    logWarning(`app.new-arch.json not found, skipping`);
    return true;
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(newArchJsonPath, 'utf8'));

    // Ensure new arch settings are correct
    let updated = false;
    if (appJson.expo && appJson.expo.plugins) {
      for (let i = 0; i < appJson.expo.plugins.length; i++) {
        const plugin = appJson.expo.plugins[i];

        if (
          Array.isArray(plugin) &&
          plugin[0] === 'react-native-image-marker'
        ) {
          plugin[1] = {
            newArchEnabled: true,
            enableFabric: true,
            enableTurboModules: true,
          };
          updated = true;
          break;
        }
      }
    }

    if (updated) {
      fs.writeFileSync(
        newArchJsonPath,
        JSON.stringify(appJson, null, 2),
        'utf8'
      );
      logSuccess('Verified app.new-arch.json configuration');
    }

    return true;
  } catch (error) {
    logError(`Failed to update app.new-arch.json: ${error.message}`);
    return false;
  }
}

/**
 * Check current Expo architecture configuration
 */
function checkExpoArchitecture() {
  const appJsonPath = path.join(EXPO_PATH, 'app.json');

  if (!fs.existsSync(appJsonPath)) {
    return { status: 'not_found', value: null };
  }

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    if (appJson.expo && appJson.expo.plugins) {
      for (const plugin of appJson.expo.plugins) {
        if (
          Array.isArray(plugin) &&
          plugin[0] === 'react-native-image-marker'
        ) {
          const config = plugin[1];
          const isNewArch = config && config.newArchEnabled === true;

          return {
            status: 'configured',
            value: isNewArch ? 'new' : 'legacy',
            config: config,
          };
        }
      }
    }

    return { status: 'not_configured', value: null };
  } catch (error) {
    return { status: 'error', value: null, error: error.message };
  }
}

/**
 * Display current status
 */
function displayStatus() {
  logInfo('\nCurrent Expo Architecture Configuration:');

  const status = checkExpoArchitecture();

  if (status.status === 'configured') {
    const color = status.value === 'new' ? 'cyan' : 'green';
    log(`  Architecture: ${status.value}`, color);
    log(`  Configuration:`, 'reset');
    log(`    newArchEnabled: ${status.config.newArchEnabled}`, 'reset');
    log(`    enableFabric: ${status.config.enableFabric}`, 'reset');
    log(`    enableTurboModules: ${status.config.enableTurboModules}`, 'reset');
  } else if (status.status === 'not_configured') {
    logWarning('  Not configured');
  } else if (status.status === 'not_found') {
    logError('  app.json not found');
  } else if (status.status === 'error') {
    logError(`  Error: ${status.error}`);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('\nExpo Architecture Switcher', 'bright');
    log('==========================\n', 'bright');
    log('Usage: node scripts/switch-expo-architecture.js <architecture>\n');
    log('Arguments:');
    log('  architecture: "legacy" or "new"\n');
    log('Examples:');
    log('  node scripts/switch-expo-architecture.js new');
    log('  node scripts/switch-expo-architecture.js legacy\n');
    log('Note: This script updates app.json configuration.');
    log(
      '      For New Architecture, you can also use app.new-arch.json directly:\n'
    );
    log('      npm run start:new-arch\n');
    process.exit(0);
  }

  const architecture = args[0].toLowerCase();

  if (architecture !== 'legacy' && architecture !== 'new') {
    logError('Invalid architecture. Must be "legacy" or "new"');
    process.exit(1);
  }

  const enableNewArch = architecture === 'new';

  log('\n' + '='.repeat(60), 'bright');
  log(`Switching Expo to ${architecture.toUpperCase()} architecture`, 'bright');
  log('='.repeat(60), 'bright');

  // Update app.json
  logInfo('\nUpdating app.json...');
  if (!updateExpoAppJson(enableNewArch)) {
    logError('\nFailed to update Expo configuration');
    process.exit(1);
  }

  // Verify app.new-arch.json
  if (enableNewArch) {
    logInfo('\nVerifying app.new-arch.json...');
    updateExpoNewArchJson();
  }

  // Display status
  displayStatus();

  logSuccess(`\n✓ Successfully switched Expo to ${architecture} architecture`);

  // Provide next steps
  log('\nNext steps:', 'bright');

  if (enableNewArch) {
    log('  Option 1: Use app.json (now configured for New Architecture)');
    log('    cd expo-example');
    log('    npm start');
    log('    npm run android  # or npm run ios');
    log('');
    log('  Option 2: Use app.new-arch.json explicitly');
    log('    cd expo-example');
    log('    npm run start:new-arch');
    log('    npm run android:new-arch  # or npm run ios:new-arch');
    log('');
    log('  For prebuild:');
    log('    npm run prebuild:new-arch');
  } else {
    log('  cd expo-example');
    log('  npm start');
    log('  npm run android  # or npm run ios');
    log('');
    log('  For prebuild:');
    log('    npm run prebuild');
  }

  log('\n' + '='.repeat(60) + '\n', 'bright');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  updateExpoAppJson,
  updateExpoNewArchJson,
  checkExpoArchitecture,
};
