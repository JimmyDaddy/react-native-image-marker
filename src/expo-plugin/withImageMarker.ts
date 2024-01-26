import { createRunOncePlugin, withPlugins } from '@expo/config-plugins';

const pkg = require('../../../package.json');

const withImageMarker = (config: any) => withPlugins(config, []);

export default createRunOncePlugin(withImageMarker, pkg.name, pkg.version);
