/* global require */
// Film mode only (EXPO_PUBLIC_FILM=1, see metro.config.js): illustrated skylines
// (video/launch-film/film-towers.py) replace the bundled building photos, which
// are third-party images not cleared for public use. Other buildings get none.
export const buildingExteriorAssets = {
  'act-one.jpg': require('./towers/act-one.png'),
  'burj-khalifa.jpg': require('./towers/burj-khalifa.png'),
  'boulevard-point.jpg': require('./towers/boulevard-point.png'),
  'opera-grand.jpg': require('./towers/opera-grand.png'),
};
