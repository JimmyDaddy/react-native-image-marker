import {
  createRunOncePlugin,
  withPlugins,
  withAppBuildGradle,
  withXcodeProject,
  type ConfigPlugin,
} from '@expo/config-plugins';

const pkg = require('../../../package.json');

interface ImageMarkerPluginProps {
  newArchEnabled?: boolean;
  enableFabric?: boolean;
  enableTurboModules?: boolean;
}

/**
 * Expo plugin for react-native-image-marker with new architecture support
 *
 * This plugin configures the library to work with both legacy and new React Native architectures.
 * It automatically detects the architecture configuration and applies appropriate settings.
 */
const withImageMarker: ConfigPlugin<ImageMarkerPluginProps | void> = (
  config,
  props = {}
) => {
  const {
    newArchEnabled = false,
    enableFabric = false,
    enableTurboModules = false,
  } = props || {};

  // Detect if new architecture is enabled from Expo config or plugin props
  const isNewArchEnabled =
    newArchEnabled ||
    (config as any).expo?.plugins?.some(
      (plugin: any) =>
        typeof plugin === 'object' &&
        plugin[0] === 'expo-dev-client' &&
        plugin[1]?.newArchEnabled
    ) ||
    process.env.RCT_NEW_ARCH_ENABLED === '1' ||
    process.env.EX_NEW_ARCH_ENABLED === '1';

  const isFabricEnabled = enableFabric || isNewArchEnabled;
  const areTurboModulesEnabled = enableTurboModules || isNewArchEnabled;

  return withPlugins(config, [
    // Configure Android build.gradle for new architecture
    (androidConfig) =>
      withAppBuildGradle(androidConfig, (buildConfig) => {
        if (buildConfig.modResults.language === 'groovy') {
          let buildGradle = buildConfig.modResults.contents;

          // Add new architecture flags if not already present
          if (
            isNewArchEnabled &&
            !buildGradle.includes('react.newArchEnabled')
          ) {
            // Add to android block
            buildGradle = buildGradle.replace(
              /android\s*{/,
              `android {
    // React Native New Architecture
    if (project.hasProperty("react.newArchEnabled") && project.react.newArchEnabled == "true") {
        react.newArchEnabled = true
    }`
            );
          }

          // Ensure proper dependencies for new architecture
          if (
            isNewArchEnabled &&
            !buildGradle.includes(
              'implementation "com.facebook.react:react-android"'
            )
          ) {
            buildGradle = buildGradle.replace(
              /dependencies\s*{/,
              `dependencies {
    // New Architecture dependencies
    if (project.react.newArchEnabled == "true") {
        implementation "com.facebook.react:react-android"
        implementation "com.facebook.react:hermes-android"
    }`
            );
          }

          buildConfig.modResults.contents = buildGradle;
        }
        return buildConfig;
      }),

    // Configure Xcode project settings for new architecture
    (iosConfig) =>
      withXcodeProject(iosConfig, (xcodeConfig) => {
        const xcodeProject = xcodeConfig.modResults;

        if (isNewArchEnabled) {
          // Add preprocessor macros for new architecture
          const configurations = xcodeProject.pbxXCBuildConfigurationSection();

          Object.keys(configurations).forEach((key) => {
            const configuration = configurations[key];
            if (configuration.buildSettings) {
              // Add new architecture flags
              if (!configuration.buildSettings.GCC_PREPROCESSOR_DEFINITIONS) {
                configuration.buildSettings.GCC_PREPROCESSOR_DEFINITIONS = [];
              }

              const preprocessorDefs =
                configuration.buildSettings.GCC_PREPROCESSOR_DEFINITIONS;
              if (Array.isArray(preprocessorDefs)) {
                if (
                  isFabricEnabled &&
                  !preprocessorDefs.includes('RCT_FABRIC_ENABLED=1')
                ) {
                  preprocessorDefs.push('RCT_FABRIC_ENABLED=1');
                }
                if (
                  areTurboModulesEnabled &&
                  !preprocessorDefs.includes('RCT_NEW_ARCH_ENABLED=1')
                ) {
                  preprocessorDefs.push('RCT_NEW_ARCH_ENABLED=1');
                }
              }
            }
          });
        }

        return xcodeConfig;
      }),
  ]);
};

export default createRunOncePlugin(withImageMarker, pkg.name, pkg.version);
