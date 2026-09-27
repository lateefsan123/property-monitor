import { Pressable, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';

export default function AddButton({ colors, onPress, disabled = false, accessibilityLabel = 'Add' }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: colors.bgBadge, opacity: disabled ? 0.4 : pressed ? 0.65 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
    <AppIcon name="plus" size={28} color={colors.text} />
  </Pressable>;
}
const styles = StyleSheet.create({ button: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' } });
