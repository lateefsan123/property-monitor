import { Pressable } from 'react-native';
import MatrixOrb from './matrix-orb';

export default function AssistantLauncher({ colors, onPress, bottom = 16 }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Open Repeat AI assistant" onPress={onPress} style={({ pressed }) => ({ position: 'absolute', right: 16, bottom, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, boxShadow: '0 3px 12px rgba(0,0,0,0.14)', opacity: pressed ? 0.7 : 1, zIndex: 5 })}>
    <MatrixOrb size={38} color={colors.text} animated={false} />
  </Pressable>;
}
