const { createRunOncePlugin, withPlugins } = require('@expo/config-plugins');
const pkg = require('./package.json');

const withImageMarker = (config) => withPlugins(config, []);

module.exports = createRunOncePlugin(withImageMarker, pkg.name, pkg.version);
