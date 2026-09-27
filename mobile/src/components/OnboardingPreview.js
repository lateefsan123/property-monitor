import sheets from '../../assets/onboarding/sheets.png';
import excel from '../../assets/onboarding/excel.png';
import gmail from '../../assets/onboarding/gmail.png';
import calendar from '../../assets/onboarding/calendar.png';
import { Image } from 'expo-image';
import { View } from 'react-native';
import sellersHero from '../../assets/onboarding/sellers-hero.png';
import listingsHero from '../../assets/onboarding/listings-hero.png';
import scheduleHero from '../../assets/onboarding/schedule-hero.png';
import { LinearGradient } from 'expo-linear-gradient';
import AppIcon from './AppIcon';

const apps = [
  { image: sheets, x: 143, y: 68 },
  { image: excel, x: 225, y: 102 },
  { icon: 'whatsapp', color: '#25c763', x: 259, y: 184 },
  { image: gmail, x: 225, y: 266 },
  { image: calendar, x: 143, y: 300 },
  { icon: 'document', color: '#357aeb', x: 61, y: 266 },
  { icon: 'building', color: '#a667d1', x: 27, y: 184 },
  { icon: 'table', color: '#f1a12e', x: 61, y: 102 },
];
const artwork = [null, sellersHero, listingsHero, scheduleHero];

// Static sample artwork, deliberately excluded from interaction and accessibility.
export default function OnboardingPreview({ step, width, height }) {
  const scale = Math.min(width / 390, height / 490);
  if (step > 0) return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height, overflow: 'hidden', backgroundColor: '#000' }}>
    <Image source={artwork[step]} accessible={false} contentFit="contain" contentPosition="center" transition={120} style={{ width: Math.min(width - 40, 340), height: '100%', alignSelf: 'center' }} />
    <LinearGradient colors={['transparent', '#000']} style={{ position: 'absolute', bottom: 0, width, height: 32 }} />
  </View>;
  return <LinearGradient colors={['#000000', '#121013']} style={{ width, height, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    <View aria-hidden pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 390, height: 490, transform: [{ scale }] }}>
      {apps.map((app, index) => <View key={index} style={{ position: 'absolute', left: app.x + 23, top: app.y + 49, width: 58, height: 58, borderRadius: 15, backgroundColor: app.color || '#f6f6f6', borderWidth: 1, borderColor: '#ffffff25', alignItems: 'center', justifyContent: 'center' }}>
        {app.image ? <Image source={app.image} style={{ width: 43, height: 43 }} contentFit="contain" /> : <AppIcon name={app.icon} color="#ffffff" size={38} />}
      </View>)}
    </View>
  </LinearGradient>;
}
