import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon';

// The nav carries only back and close so the Repeat AI name appears at most
// once per screen. Onboarding tokens measured from Opal's iOS onboarding (Mobbin flows
// 91394aa7 and 7b6dc8e9) at 3x: 16pt gutters, 56pt pill CTA, 12pt row gaps.
export const O = {
  bg: '#000000',
  row: '#161417',
  line: '#1B191C',
  ring: '#39373A',
  chip: '#282629',
  text: '#FFFFFF',
  hint: '#EEEEEE',
  body: '#BDBDBD',
  muted: '#8E8E93',
  blue: '#0B72F3',
  disabledText: '#5C5A5D',
  gutter: 16,
};

export function OnboardingNav({ onBack, onClose, busy }) {
  return <View style={s.nav}>
    <View style={s.navSide}>{onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" disabled={busy} hitSlop={8} onPress={onBack} style={[s.navButton, busy && { opacity: 0.4 }]}><AppIcon name="chevronBack" size={24} color={O.text} /></Pressable> : null}</View>
    <View style={{ flex: 1 }} />
    <View style={[s.navSide, { alignItems: 'flex-end' }]}>{onClose ? <Pressable accessibilityRole="button" accessibilityLabel="Close onboarding" disabled={busy} hitSlop={8} onPress={onClose} style={s.navButton}><AppIcon name="close" size={24} color={O.muted} /></Pressable> : null}</View>
  </View>;
}

export function OnboardingSegments({ count, index }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: index + 1 }} style={s.segments}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={[s.segment, i <= index && { backgroundColor: O.text }]} />)}
  </View>;
}

export function PillButton({ label, onPress, disabled, busy, dark, icon, compact, height, accessibilityLabel }) {
  const off = disabled && !busy;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled: Boolean(disabled || busy), busy: Boolean(busy) }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [s.pill, compact && { minHeight: 48 }, height && { minHeight: height }, { backgroundColor: off || dark ? O.line : O.text, opacity: pressed ? 0.8 : 1 }]}>
    {busy ? <ActivityIndicator color={dark ? O.text : '#000'} /> : <>{icon}<Text style={[s.pillText, { color: off ? O.disabledText : dark ? O.text : '#000' }]}>{label}</Text></>}
  </Pressable>;
}

export function TextLink({ label, onPress, disabled, tone = 'strong' }) {
  return <Pressable accessibilityRole="button" disabled={disabled} hitSlop={6} onPress={onPress} style={s.link}>
    <Text style={[s.linkText, tone === 'muted' && { color: O.muted, fontWeight: '400' }]}>{label}</Text>
  </Pressable>;
}

export const onboardingText = StyleSheet.create({
  title: { color: O.text, fontSize: 28, lineHeight: 34, fontWeight: '600', textAlign: 'center', letterSpacing: -0.3, paddingHorizontal: 24 },
  hint: { color: O.hint, fontSize: 15, lineHeight: 20, textAlign: 'center', paddingHorizontal: 32, marginTop: 6 },
  body: { color: O.body, fontSize: 17, lineHeight: 23, textAlign: 'center', paddingHorizontal: 32, marginTop: 10 },
  lead: { color: O.hint, fontSize: 17, lineHeight: 22, textAlign: 'center', paddingHorizontal: 28, marginTop: 8 },
  statement: { color: O.text, fontSize: 24, lineHeight: 31, fontWeight: '400', textAlign: 'center', paddingHorizontal: 32 },
  input: { minHeight: 53, borderWidth: 1, borderColor: '#48464A', borderRadius: 14, paddingHorizontal: 16, color: O.text, fontSize: 17 },
});

const s = StyleSheet.create({
  nav: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  navSide: { width: 60 },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: 24, marginTop: 6 },
  segment: { flex: 1, height: 3, borderRadius: 1.5, backgroundColor: '#272528' },
  pill: { minHeight: 56, borderRadius: 999, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pillText: { fontSize: 17, fontWeight: '500' },
  link: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: O.text, fontSize: 17, fontWeight: '600' },
});
