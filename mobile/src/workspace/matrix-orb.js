import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, View } from 'react-native';

// Native rendering of the same round dot matrix as the desktop MatrixOrb.
// Only scale animates; the native driver keeps it off the React render loop.
const ORBITERS = [
  { radius: .62, speed: 2.2, phase: 0, spread: .42 },
  { radius: .4, speed: -1.7, phase: 2.1, spread: .36 },
  { radius: .8, speed: 1.15, phase: 4, spread: .34 },
];
const SAMPLES = Array.from({ length: 33 }, (_, index) => index / 32);

function intensity(state, distance, x, y, phase) {
  const t = phase * Math.PI * 2;
  if (state === 'thinking') {
    const heat = ORBITERS.reduce((sum, orb) => {
      const angle = t * Math.sign(orb.speed) + orb.phase;
      const dx = x - Math.cos(angle) * orb.radius;
      const dy = y - Math.sin(angle) * orb.radius;
      return sum + Math.exp(-(dx * dx + dy * dy) / (orb.spread * orb.spread));
    }, 0);
    return (.26 + .8 * Math.min(1, heat)) * .92;
  }
  if (state === 'listening') return .52 + .3 * Math.sin(distance * 4.2 - t);
  return (.62 + .12 * Math.sin(t - distance * 2.4)) * .88;
}

export default function MatrixOrb({ size = 116, color, state = 'idle', animated = true }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!animated || reduceMotion) return;
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration: state === 'thinking' ? 4000 : 6000,
      easing: Easing.linear, useNativeDriver: true, isInteraction: false,
    }));
    const update = next => {
      animation.stop();
      if (next === 'active') { progress.setValue(0); animation.start(); }
    };
    update(AppState.currentState || 'active');
    const subscription = AppState.addEventListener('change', update);
    return () => { animation.stop(); progress.setValue(0); subscription.remove(); };
  }, [animated, reduceMotion, progress, state]);
  const dots = useMemo(() => {
    const spacing = size * .074;
    const points = [];
    for (let row = 0; row < 11; row++) {
      for (let column = 0; column < 11; column++) {
        const x = (column - 5) / 5, y = (row - 5) / 5;
        const distance = Math.hypot(x, y);
        if (distance > 1.12) continue;
        const radius = spacing * .6 * Math.exp(-distance * distance * 1.7);
        points.push({
          key: `${row}-${column}`, radius,
          left: size / 2 + (column - 5) * spacing - radius,
          top: size / 2 + (row - 5) * spacing - radius,
          scale: animated && !reduceMotion ? progress.interpolate({
            inputRange: SAMPLES,
            outputRange: SAMPLES.map(phase => intensity(state, distance, x, y, phase)),
          }) : intensity(state, distance, x, y, 0),
        });
      }
    }
    return points;
  }, [size, animated, reduceMotion, progress, state]);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    {dots.map(dot => <Animated.View key={dot.key} style={{ position: 'absolute', left: dot.left, top: dot.top,
      width: dot.radius * 2, height: dot.radius * 2, borderRadius: dot.radius, backgroundColor: color,
      transform: [{ scale: dot.scale }],
    }} />)}
  </View>;
}
