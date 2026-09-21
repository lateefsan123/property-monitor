const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..')];
// EAS installs this standalone app, not the web root. Shared source still
// needs access to its dependencies, and must use the native app's React.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
