import { Image } from 'expo-image';
import { View } from 'react-native';
import AppIcon from './AppIcon';
import sheets from '../../assets/onboarding/sheets.png';
import excel from '../../assets/onboarding/excel.png';
import gmail from '../../assets/onboarding/gmail.png';
import calendar from '../../assets/onboarding/calendar.png';
import logo from '../../assets/repeat-ai-icon.png';
import bayut from '../../assets/onboarding/bayut.svg';
import sellers from '../../assets/onboarding/sellers-screen.png';
import listings from '../../assets/onboarding/listings-screen.png';
import schedule from '../../assets/onboarding/schedule-screen.png';
import messages from '../../assets/onboarding/messages-screen.png';

const screens = { sellers, listings, schedule, messages };
const apps = [
  { image: sheets, x: 145, y: 20 }, { image: excel, x: 250, y: 66 },
  { icon: 'whatsapp', color: '#25b65b', x: 292, y: 171 }, { image: gmail, x: 250, y: 276 },
  { image: calendar, x: 145, y: 322 }, { icon: 'document', color: '#357aeb', x: 40, y: 276 },
  { image: bayut, wide: true, x: 0, y: 171 }, { icon: 'table', color: '#e0a13b', x: 40, y: 66 },
];
export default function OnboardingPreview({ screen, width, height }) {
  if (screen === 'integrations') {
    const scale = Math.max(0, Math.min((width - 32) / 360, height / 400));
    return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 360, height: 400, transform: [{ scale }] }}>
        <View style={{ position: 'absolute', width: 292, height: 292, borderWidth: 1, borderColor: '#E8E8E8', borderRadius: 146, left: 28, top: 51 }} />
        <View style={{ position: 'absolute', width: 188, height: 188, borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 94, left: 80, top: 103 }} />
        <Image source={logo} contentFit="contain" style={{ position: 'absolute', left: 131, top: 154, width: 86, height: 86, borderRadius: 22 }} />
        {apps.map((app, index) => <View key={index} style={{ position: 'absolute', left: app.x, top: app.y, width: 58, height: 58, borderRadius: 16, backgroundColor: app.color || '#F7F7F7', borderWidth: app.color ? 0 : 1, borderColor: '#EDEDED', alignItems: 'center', justifyContent: 'center' }}>{app.image ? <Image source={app.image} contentFit="contain" style={{ width: app.wide ? 48 : 36, height: 36 }} /> : <AppIcon name={app.icon} color="#FFFFFF" size={32} />}</View>)}
      </View>
    </View>;
  }
  // Width-based frame: its lower edge continues behind the fixed footer.
  const phoneWidth = Math.max(0, Math.min(Math.min(width, 480) * 0.78, Math.max(Math.min(width, 480) * 0.64, (height + 64) * 1080 / 2340)));
  return <View pointerEvents="none" style={{ width, height, alignItems: 'center', overflow: 'hidden' }}>
    <View style={{ flexShrink: 0, width: phoneWidth, aspectRatio: 1080 / 2340, borderRadius: 32, borderWidth: 4, borderColor: '#000', backgroundColor: '#111111', padding: 2, overflow: 'hidden' }}>
      <View style={{ flex: 1, borderRadius: 26, overflow: 'hidden', backgroundColor: '#111111' }}><Image source={screens[screen]} accessibilityLabel={`${screen} screen with example data`} contentFit="contain" style={{ width: '100%', height: '100%' }} /></View>
    </View>
  </View>;
}
