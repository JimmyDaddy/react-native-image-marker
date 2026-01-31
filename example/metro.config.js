const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');

const config = {
  projectRoot: __dirname,
  watchFolders: [root],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
