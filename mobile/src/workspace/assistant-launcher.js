import { Pressable, Text, View } from 'react-native';
import MatrixOrb from './matrix-orb';

export default function AssistantLauncher({ colors, onPress, bottom = 16 }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Ask Repeat, talk or type" onPress={onPress} style={({ pressed }) => ({ position: 'absolute', right: 16, bottom, minWidth: 158, height: 58, borderRadius: 29, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, boxShadow: '0 3px 12px rgba(0,0,0,0.14)', opacity: pressed ? 0.7 : 1, zIndex: 5 })}>
    <MatrixOrb size={38} color={colors.text} animated={false} />
    <View style={{ gap: 1 }}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>Ask Repeat</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>Talk or type</Text>
    </View>
  </Pressable>;
}
