import { registerRootComponent } from 'expo';

import App from './App';
import Constants from 'expo-constants';
import OutreachApp from './src/outreach/OutreachApp';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Constants.expoConfig?.extra?.outreachEdition ? OutreachApp : App);
