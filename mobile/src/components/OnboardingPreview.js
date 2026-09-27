import sheets from '../../assets/onboarding/sheets.png';
import excel from '../../assets/onboarding/excel.png';
import gmail from '../../assets/onboarding/gmail.png';
import calendar from '../../assets/onboarding/calendar.png';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
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
const sellers = [
  ['SA', 'Sarah Ahmed', 'Marina Heights · 2 bed', '#d79372'],
  ['JW', 'James Wilson', 'Downtown Views · 1 bed', '#76908f'],
  ['AK', 'Aisha Khan', 'Burj Vista · 2 bed', '#a786b5'],
  ['OM', 'Omar Malik', 'The Lofts · 1 bed', '#91a879'],
  ['EL', 'Emma Lewis', 'South Ridge · 3 bed', '#aa8b73'],
  ['RH', 'Rami Hassan', 'Boulevard Point · 2 bed', '#829ac0'],
  ['NC', 'Nina Chen', 'Claren · 1 bed', '#bd8097'],
];

// Static sample artwork, deliberately excluded from interaction and accessibility.
export default function OnboardingPreview({ step, width, height }) {
  const scale = Math.min(width / 390, height / 490);
  return <LinearGradient colors={['#000000', '#121013']} style={{ width, height, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
    <View aria-hidden pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 390, height: 490, transform: [{ scale }] }}>
      {step === 0 ? apps.map((app, index) => <View key={index} style={{ position: 'absolute', left: app.x + 23, top: app.y + 49, width: 58, height: 58, borderRadius: 15, backgroundColor: app.color || '#f6f6f6', borderWidth: 1, borderColor: '#ffffff25', alignItems: 'center', justifyContent: 'center' }}>
        {app.image ? <Image source={app.image} style={{ width: 43, height: 43 }} contentFit="contain" /> : <AppIcon name={app.icon} color="#ffffff" size={38} />}
      </View>) : step === 1 ? <View style={{ position: 'absolute', left: 37, top: -60, width: 305, height: 660, borderRadius: 36, backgroundColor: '#050505', borderWidth: 3, borderColor: '#444047', padding: 18, transform: [{ rotate: '-13deg' }] }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', paddingTop: 40, paddingBottom: 18 }}>Sellers</Text>
        {sellers.map(([initials, name, detail, color]) => <View key={name} style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, alignItems: 'center' }}>
          <View style={{ width: 42, height: 45, borderRadius: 9, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 15, color: '#fff', fontWeight: '600' }}>{initials}</Text></View>
          <View style={{ gap: 5 }}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{name}</Text><Text style={{ color: '#8e8b91', fontSize: 12 }}>{detail}</Text></View>
        </View>)}
      </View> : <View style={{ position: 'absolute', left: 24, right: 24, top: 104, gap: 12 }}>
        {[
          ['A new price. A better conversation.', 'Marina Heights · Price dropped 12.5%', 'chart'],
          ['The right time to follow up.', 'Your buildings. Your schedule.', 'calendar'],
          ['Keep every conversation moving.', 'Personal follow-ups through WhatsApp', 'whatsapp'],
        ].map(([title, detail, icon]) => <View key={title} style={{ minHeight: 98, borderRadius: 18, padding: 18, gap: 12, backgroundColor: '#181619', borderWidth: 1, borderColor: '#252226' }}>
          <Text style={{ color: '#f5f3f5', fontSize: 19, lineHeight: 24, fontFamily: 'Georgia' }}>{title}</Text>
          <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}><AppIcon name={icon} size={19} color="#a19ca4" /><Text style={{ color: '#99949c', fontSize: 13 }}>{detail}</Text></View>
        </View>)}
      </View>}
    </View>
  </LinearGradient>;
}
