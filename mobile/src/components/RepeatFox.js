import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Ellipse, Path, Polygon } from 'react-native-svg';
import { FOX_CHIN, FOX_COLLAR, FOX_COLORS, FOX_EYES, FOX_HEAD, FOX_SUIT } from '../../../shared/repeat-fox';
import useReducedMotion from './use-reduced-motion';

// Repeat, the broker fox (same drawing as the web RepeatFox). When animated it
// blinks, tilts its head while listening and nods while thinking. The head is
// its own layer so it can turn around the chin on the native driver.
export default function RepeatFox({ size = 32, state = 'idle', animated = true }) {
  const reduced = useReducedMotion();
  const moving = animated && !reduced;
  const [angle] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!moving) return undefined;
    let open;
    const timer = setInterval(() => {
      setBlink(true);
      open = setTimeout(() => setBlink(false), 130);
    }, 4200);
    return () => { clearInterval(timer); clearTimeout(open); setBlink(false); };
  }, [moving]);

  useEffect(() => {
    const turn = (toValue, duration) => Animated.timing(angle, { toValue, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    if (!moving || state === 'idle') {
      turn(0, moving ? 250 : 0).start();
      return undefined;
    }
    if (state === 'listening') {
      turn(-8, 300).start();
      return undefined;
    }
    const nod = Animated.loop(Animated.sequence([turn(4, 300), turn(0, 300)]));
    nod.start();
    return () => nod.stop();
  }, [angle, moving, state]);

  const rotate = angle.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const layer = { position: 'absolute', left: 0, top: 0, width: size, height: size };
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Animated.View style={[layer, { transformOrigin: `${FOX_CHIN.x}% ${FOX_CHIN.y}%`, transform: [{ rotate }] }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {FOX_HEAD.map(shape => <Polygon key={shape.points} points={shape.points} fill={FOX_COLORS[shape.fill]} />)}
        {FOX_EYES.map(eye => <Ellipse key={eye.cx} cx={eye.cx} cy={eye.cy} rx={eye.r} ry={blink ? eye.r * 0.12 : eye.r} fill={FOX_COLORS.ink} />)}
      </Svg>
    </Animated.View>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={layer}>
      <Path d={FOX_SUIT} fill={FOX_COLORS.suit} />
      {FOX_COLLAR.map(shape => <Polygon key={shape.points} points={shape.points} fill={FOX_COLORS[shape.fill]} />)}
    </Svg>
  </View>;
}
