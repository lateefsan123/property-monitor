import { Image, Text, View } from 'react-native';
import { Svg, Rect, Path, Circle } from 'react-native-svg';
import { Button } from '../workspace/ui';
import spreadsheetArtwork from '../../assets/spreadsheets-empty.png';

function ListingArtwork({ colors: c }) {
  const ink = c.isDark ? '#a4acb9' : '#566174';
  const paper = c.isDark ? '#252b34' : '#ffffff';
  const soft = c.isDark ? '#343d49' : '#e8edf2';
  return <Svg width={180} height={150} viewBox="0 0 180 150" accessible={false}>
    <Circle cx={90} cy={75} r={66} fill={c.isDark ? '#1b2028' : '#f0f3f6'} />
    <Rect x={44} y={29} width={77} height={106} rx={8} fill={paper} stroke={ink} strokeWidth={2} />
    {[48, 71, 94].map(y => [59, 84].map(x => <Rect key={`${x}-${y}`} x={x} y={y} width={12} height={12} rx={2} fill={soft} />))}
    <Path d="M73 134v-15h19v15" fill={soft} stroke={ink} strokeWidth={2} />
    <Rect x={107} y={87} width={44} height={39} rx={7} fill={paper} stroke={ink} strokeWidth={2} />
    <Path d="M117 106h23m-7-7 7 7-7 7" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

export default function CollectionEmptyState({ kind, title, description, actionLabel, onAction, colors }) {
  return <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 20 }}>
    {kind === 'sellers' ? <Image source={spreadsheetArtwork} accessible={false} resizeMode="contain" style={{ width: 190, height: 150 }} /> : <ListingArtwork colors={colors} />}
    <View style={{ gap: 8, alignItems: 'center', maxWidth: 300 }}>
      <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>{description}</Text>
    </View>
    {actionLabel && onAction ? <Button colors={colors} primary onPress={onAction} style={{ minWidth: 200, minHeight: 48, borderRadius: 12 }}>{actionLabel}</Button> : null}
  </View>;
}
