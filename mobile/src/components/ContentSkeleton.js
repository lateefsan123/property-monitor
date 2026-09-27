import { View } from 'react-native';

// Static placeholders deliberately respect Reduce Motion without a perpetual shimmer.
export default function ContentSkeleton({ colors, rows = 3, variant = 'list', label = 'Loading content', style }) {
  const block = { backgroundColor: colors.bgBadge || colors.border, borderRadius: 6 };
  return <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} style={[{ gap: 16, width: '100%', paddingVertical: 12 }, style]}>
    {Array.from({ length: rows }, (_, index) => <View key={index} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: 14, padding: 16, backgroundColor: colors.bgCard, borderRadius: 16 }}>
      {variant === 'cards' ? <View style={[block, { height: 132, width: '100%', borderRadius: 12 }]} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[block, { width: 44, height: 44, borderRadius: variant === 'list' ? 22 : 10 }]} />
        <View style={{ flex: 1, gap: 10 }}><View style={[block, { width: '64%', height: 13 }]} /><View style={[block, { width: '86%', height: 10 }]} /></View>
      </View>
      {variant === 'cards' ? <View style={[block, { width: '44%', height: 12 }]} /> : null}
    </View>)}
  </View>;
}
