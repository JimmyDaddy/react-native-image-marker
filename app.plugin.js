const pkg = require('./package.json');

const loadConfigPlugins = () => {
  try {
    return require('@expo/config-plugins');
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }

    // `file:` installs are symlinked to this repository, so Node cannot walk up
    // from this file to the Expo application's dependencies. Resolve Expo's
    // public config-plugin entry point from the application instead.
    const expoConfigPlugins = require.resolve('expo/config-plugins', {
      paths: [process.cwd()],
    });
    return require(expoConfigPlugins);
  }
};

const { createRunOncePlugin, withPlugins } = loadConfigPlugins();

const withImageMarker = (config) => withPlugins(config, []);

module.exports = createRunOncePlugin(withImageMarker, pkg.name, pkg.version);
