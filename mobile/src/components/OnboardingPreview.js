import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import AppIcon from './AppIcon';
import { O } from './onboarding-ui';
import icon from '../../assets/repeat-ai-icon.png';
import sheets from '../../assets/onboarding/sheets.png';
import excel from '../../assets/onboarding/excel.png';
import gmail from '../../assets/onboarding/gmail.png';
import calendar from '../../assets/onboarding/calendar.png';
import bayut from '../../assets/onboarding/bayut.svg';
import burjKhalifa from '../../assets/buildings/burj-khalifa.jpg';
import actOne from '../../assets/buildings/act-one.jpg';
import boulevardPoint from '../../assets/buildings/boulevard-point.jpg';

// Scenes draw on a fixed canvas and scale to the stage so every device shows
// the same composition. Names, units and prices are sample data.
const W = 340;
const H = 380;
const card = '#1C1A1D';
const hairline = '#2E2C2F';
const green = '#30D158';
const red = '#FF453A';

// Opal's "Connect to Screen Time" frame: a blue ring around one dark card.
function Showcase({ children }) {
  return <View style={s.ring}><View style={s.card}>{children}</View></View>;
}

function Avatar({ initials }) {
  return <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>;
}

function Sellers() {
  const rows = [['AM', 'Alex Morgan', 'Act One · Unit 1204'], ['JT', 'Jamie Taylor', 'St. Regis · Unit 905'], ['SL', 'Sam Lee', 'Boulevard Point · Unit 1702']];
  return <Showcase>
    <View style={[s.row, { paddingVertical: 14 }]}><Text style={s.cardTitle}>Due today</Text><View style={s.chip}><Text style={s.chipText}>24 sellers</Text></View></View>
    {rows.map(([initials, name, place], i) => <View key={name} style={[s.row, s.divider]}>
      <Avatar initials={initials} />
      <View style={{ flex: 1, gap: 2 }}><Text style={s.name}>{name}</Text><Text style={s.meta}>{place}</Text></View>
      {i === 0 ? <View style={s.whatsapp}><AppIcon name="whatsapp" size={17} color="#FFF" /></View> : <Text style={[s.meta, { color: red }]}>Due</Text>}
    </View>)}
  </Showcase>;
}

function Listings() {
  return <Showcase>
    <Image source={burjKhalifa} contentFit="cover" style={{ height: 136 }} />
    <View style={[s.row, { alignItems: 'flex-start', paddingTop: 14 }]}>
      <View style={{ flex: 1, gap: 2 }}><Text style={s.name}>Burj Khalifa</Text><Text style={s.meta}>2 bed · 1,420 sq ft</Text></View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}><Text style={s.name}>AED 3.1M</Text><Text style={[s.meta, { color: red, fontWeight: '600' }]}>▼ 8.8% this week</Text></View>
    </View>
    <Svg width="100%" height={44} viewBox="0 0 280 44" preserveAspectRatio="none" style={{ marginBottom: 12 }}>
      <Path d="M16 12 L60 10 L100 13 L140 9 L180 12 L208 22 L236 28 L264 34" stroke={red} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={264} cy={34} r={3.5} fill={red} />
    </Svg>
  </Showcase>;
}

function Messages() {
  return <Showcase>
    <View style={[s.row, { paddingVertical: 12 }]}>
      <Avatar initials="AM" />
      <View style={{ flex: 1, gap: 2 }}><Text style={s.name}>Alex Morgan</Text><Text style={s.meta}>Act One · Unit 1204</Text></View>
      <AppIcon name="whatsapp" size={20} color={green} />
    </View>
    <View style={[s.divider, { padding: 14, gap: 12 }]}>
      <View style={s.bubble}>
        <Text style={s.bubbleText}>Hi Alex, a 2 bed in Act One just sold for AED 2.9M. Worth a quick chat about yours?</Text>
        <Text style={s.bubbleTime}>10:02 ✓✓</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[s.chip, { flexDirection: 'row', gap: 5 }]}><AppIcon name="document" size={13} color={O.hint} /><Text style={s.chipText}>Market update</Text></View>
        <View style={s.chip}><Text style={s.chipText}>Personalised</Text></View>
      </View>
    </View>
  </Showcase>;
}

function Toggle({ on }) {
  return <View style={[s.toggle, { backgroundColor: on ? green : O.ring, alignItems: on ? 'flex-end' : 'flex-start' }]}><View style={s.knob} /></View>;
}

function Schedule() {
  const days = [['M', 1], ['T', 0], ['W', 1], ['T', 0], ['F', 1], ['S', 0], ['S', 0]];
  return <Showcase>
    <View style={[s.row, { paddingVertical: 14 }]}><Text style={s.cardTitle}>Follow-ups</Text><View style={s.chip}><Text style={s.chipText}>10:00 AM</Text></View></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 }}>
      {days.map(([day, on], i) => <View key={i} style={[s.day, on && { backgroundColor: O.text }]}><Text style={[s.dayText, on && { color: '#000' }]}>{day}</Text></View>)}
    </View>
    {[[actOne, 'Act One', '18 sellers', true], [boulevardPoint, 'Boulevard Point', '11 sellers', false]].map(([photo, name, count, on]) => <View key={name} style={[s.row, s.divider]}>
      <Image source={photo} contentFit="cover" style={s.thumb} />
      <View style={{ flex: 1, gap: 2 }}><Text style={s.name}>{name}</Text><Text style={s.meta}>{count}</Text></View>
      <Toggle on={on} />
    </View>)}
  </Showcase>;
}

// Opal's welcome: one lit hero object, with smaller ones drifting at depth.
const floating = [
  { image: sheets, size: 64, x: 22, y: 34, opacity: 0.9 },
  { image: excel, size: 46, x: 262, y: 18, opacity: 0.5 },
  { icon: 'whatsapp', size: 70, x: 250, y: 178, opacity: 0.95 },
  { image: gmail, size: 50, x: 36, y: 262, opacity: 0.65 },
  { image: calendar, size: 40, x: 208, y: 312, opacity: 0.4 },
  { image: bayut, size: 44, wide: true, x: 0, y: 160, opacity: 0.35 },
];
function Welcome() {
  return <>
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id="welcome" cx="50%" cy="48%" r="50%"><Stop offset="0" stopColor="#3B5BDB" stopOpacity={0.28} /><Stop offset="1" stopColor="#3B5BDB" stopOpacity={0} /></RadialGradient></Defs>
      <Rect width={W} height={H} fill="url(#welcome)" />
    </Svg>
    {floating.map((item, i) => <View key={i} style={[s.float, { left: item.x, top: item.y, width: item.wide ? item.size * 1.7 : item.size, height: item.size, borderRadius: item.size * 0.28, opacity: item.opacity }]}>
      {item.image ? <Image source={item.image} contentFit="contain" style={{ width: item.size * (item.wide ? 1.3 : 0.52), height: item.size * 0.52 }} /> : <AppIcon name={item.icon} size={item.size * 0.54} color="#25D366" />}
    </View>)}
    <View style={s.hero}><View style={s.heroClip}><Image source={icon} contentFit="cover" style={{ width: '100%', height: '100%' }} /></View></View>
  </>;
}

const scenes = { integrations: Welcome, sellers: Sellers, listings: Listings, messages: Messages, schedule: Schedule };

export default function OnboardingPreview({ screen, width, height }) {
  const Scene = scenes[screen];
  if (!Scene) return null;
  const scale = Math.max(0, Math.min(width / W, height / H, 1.15));
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: W, height: H, justifyContent: 'center', transform: [{ scale }] }}><Scene /></View>
  </View>;
}

// Opal's large gradient figure ("8 years+"), drawn with SVG so the gradient
// fills the glyphs on iOS, Android and web alike. Native SVG text already uses
// the system face; browsers default SVG text to a serif, so name one there.
const statFont = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;
export function GradientStat({ value, width = 320 }) {
  return <Svg width={width} height={92} accessibilityLabel={value}>
    <Defs><LinearGradient id="stat" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#5EEAD4" /><Stop offset="1" stopColor="#30D158" /></LinearGradient></Defs>
    <SvgText x={width / 2} y={72} fontSize={72} fontWeight="700" textAnchor="middle" fill="url(#stat)" letterSpacing={-1.5} fontFamily={statFont}>{value}</SvgText>
  </Svg>;
}

const s = StyleSheet.create({
  ring: { marginHorizontal: 20, padding: 7, borderRadius: 24, borderWidth: 1.5, borderColor: '#1F6FEB', shadowColor: O.blue, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  card: { borderRadius: 16, backgroundColor: card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: hairline },
  cardTitle: { flex: 1, color: O.text, fontSize: 17, fontWeight: '600' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: O.chip, alignItems: 'center' },
  chipText: { color: O.hint, fontSize: 13, fontWeight: '600' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: hairline, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: O.text, fontSize: 13, fontWeight: '600' },
  name: { color: O.text, fontSize: 16, fontWeight: '600' },
  meta: { color: O.muted, fontSize: 13 },
  whatsapp: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  bubble: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: '#005C4B', borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  bubbleTime: { color: '#9AD8C9', fontSize: 11, alignSelf: 'flex-end', marginTop: 3 },
  day: { width: 34, height: 34, borderRadius: 17, backgroundColor: O.chip, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: O.muted, fontSize: 14, fontWeight: '600' },
  thumb: { width: 40, height: 40, borderRadius: 10 },
  toggle: { width: 51, height: 31, borderRadius: 16, padding: 2 },
  knob: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFF' },
  float: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: card, borderWidth: 1, borderColor: hairline },
  hero: { position: 'absolute', left: (W - 132) / 2, top: (H - 132) / 2, width: 132, height: 132, borderRadius: 32, backgroundColor: '#000', shadowColor: '#7C9CFF', shadowOpacity: 0.55, shadowRadius: 36, shadowOffset: { width: 0, height: 0 } },
  heroClip: { flex: 1, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: '#2E2C2F' },
});
