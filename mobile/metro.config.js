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
const FILM_MODE = process.env.EXPO_PUBLIC_FILM === '1';
const REAL_SUPABASE = path.resolve(__dirname, 'src', 'supabase.js');
const FILM_SUPABASE = path.resolve(__dirname, 'film', 'fake-supabase.js');
const REAL_VOICE = path.resolve(__dirname, '..', 'shared', 'use-voice.js');
const FILM_VOICE = path.resolve(__dirname, 'film', 'fake-use-voice.js');
const REAL_EXTERIORS = path.resolve(__dirname, 'src', 'features', 'listing-alerts', 'building-exterior-assets.js');
const FILM_EXTERIORS = path.resolve(__dirname, 'film', 'building-exterior-assets.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/') || moduleName === '@tanstack/react-query') {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [__dirname] }),
    };
  }
  const resolved = context.resolveRequest(context, moduleName, platform);
  // Film mode (EXPO_PUBLIC_FILM=1, dev only): swap the Supabase client for an
  // offline demo backend so launch-film captures never touch real accounts.
  if (FILM_MODE && resolved?.filePath === REAL_SUPABASE) return { type: 'sourceFile', filePath: FILM_SUPABASE };
  // ...and wrap the voice hook so captures can script a voice conversation.
  if (FILM_MODE && resolved?.filePath === REAL_VOICE && context.originModulePath !== FILM_VOICE) return { type: 'sourceFile', filePath: FILM_VOICE };
  // ...and show illustrated skylines instead of the uncleared building photos.
  if (FILM_MODE && resolved?.filePath === REAL_EXTERIORS) return { type: 'sourceFile', filePath: FILM_EXTERIORS };
  return resolved;
};
module.exports = config;
