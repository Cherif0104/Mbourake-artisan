const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration - watch parent folder so shared/ is resolvable.
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '..')],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    extraNodeModules: {
      shared: path.resolve(__dirname, '../shared'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
