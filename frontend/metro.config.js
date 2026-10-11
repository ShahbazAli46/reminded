const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.watcher = {
  ...defaultConfig.watcher,
  healthCheck: {
    enabled: true,
  },
};

defaultConfig.resolver = {
  ...defaultConfig.resolver,
  blockList: [
    /reference_screens\/.*/,
    /\.git\/.*/,
  ],
};

module.exports = defaultConfig;
