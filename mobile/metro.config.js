const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..')];
// EAS installs this standalone app, not the web root. Shared source still
// needs access to its dependencies and the same React/context installations.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/') || moduleName === '@tanstack/react-query') {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
