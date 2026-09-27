import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import useReducedMotion from './use-reduced-motion';

// Keep visited pages mounted, including their scroll position and query state.
export default function MotionScreen({ active, children }) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    opacity.stopAnimation();
    if (!active || reduced) { opacity.setValue(1); return; }
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1, duration: 160, easing: Easing.out(Easing.quad),
      useNativeDriver: true, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, reduced, opacity]);
  return (
    <Animated.View
      style={{ flex: 1, display: active ? 'flex' : 'none', opacity }}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </Animated.View>
  );
}
