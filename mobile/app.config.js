/* global process */
export default ({ config }) => {
  if (process.env.REPEAT_APP_VARIANT !== 'outreach') return config;
  return { ...config, name:'Repeat AI Outreach', scheme:'repeat-outreach',
    android:{...config.android,package:'com.lateefsan.repeatoutreach',versionCode:4},
    ios:{...config.ios,bundleIdentifier:'com.lateefsan.repeatoutreach',buildNumber:'1'},
    extra:{...config.extra,outreachEdition:true},
  };
};
