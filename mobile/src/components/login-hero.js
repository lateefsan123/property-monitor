import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import skyline from '../../assets/skyline-line.png';

// White line-art Dubai skyline (from assets/bg.jpg), drawn wider than the
// screen and centred on the Burj Khalifa over a faint blue horizon glow.
const RATIO = 1004 / 280;

export default function LoginHero() {
  const [size, setSize] = useState(null);
  const w = size ? Math.max(size.width * 2.2, 760) : 0;
  return <View style={s.hero} onLayout={({ nativeEvent: { layout } }) => setSize({ width: layout.width, height: layout.height })} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {size ? <>
      <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
        {/* Centred behind the towers and fully faded by the hero's lower edge,
            so the waterline sits on black with no seam above the title. */}
        <Defs><RadialGradient id="horizon" cx="50%" cy="56%" r="44%"><Stop offset="0" stopColor="#3B5BDB" stopOpacity={0.3} /><Stop offset="0.6" stopColor="#3B5BDB" stopOpacity={0.1} /><Stop offset="1" stopColor="#3B5BDB" stopOpacity={0} /></RadialGradient></Defs>
        <Rect width={size.width} height={size.height} fill="url(#horizon)" />
      </Svg>
      <Image source={skyline} contentFit="contain" style={{ position: 'absolute', width: w, height: w / RATIO, left: (size.width - w) / 2, bottom: 14, opacity: 0.9 }} />
    </> : null}
  </View>;
}

const s = StyleSheet.create({
  hero: { flex: 1, minHeight: 0, overflow: 'hidden' },
});
