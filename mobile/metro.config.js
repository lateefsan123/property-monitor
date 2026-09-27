const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = ['src', 'shared', 'supabase/functions/_shared'].map((folder) =>
  path.resolve(__dirname, '..', folder),
);
// Shared app source lives at the repository root, alongside large exports and
// temporary checkouts. Watching those artifacts stalls Windows Metro startup.
const escapePath = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ignoredFolders = ['tmp', 'video', 'outputs', '.git', 'dist'].map((name) =>
  new RegExp(`^${escapePath(path.resolve(__dirname, '..', name))}[/\\\\]`),
);
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList].filter(Boolean)),
  ...ignoredFolders,
  new RegExp(`^${escapePath(__dirname)}[/\\\\]dist[^/\\\\]*[/\\\\]`),
];
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
