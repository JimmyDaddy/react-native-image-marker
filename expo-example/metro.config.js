const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const { getDefaultConfig } = require('expo/metro-config');

const pak = require('../package.json');

const root = path.resolve(__dirname, '..');
const modules = Object.keys({
  ...pak.peerDependencies,
}).concat([
  'filesize',
  'react-native-image-marker',
  'react-native-toast-message',
]);
const blockedModuleRoots = [
  path.join(root, 'node_modules'),
  path.join(root, 'example', 'node_modules'),
];

const escapePath = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = getDefaultConfig(__dirname);

config.watchFolders = [root];
config.resolver.blockList = exclusionList(
  blockedModuleRoots.flatMap((moduleRoot) =>
    modules.map(
      (name) =>
        new RegExp(`^${escapePath(path.join(moduleRoot, name))}[\\\\/].*$`)
    )
  )
);
config.resolver.extraNodeModules = modules.reduce((acc, name) => {
  acc[name] = path.join(__dirname, 'node_modules', name);
  return acc;
}, {});

module.exports = config;
