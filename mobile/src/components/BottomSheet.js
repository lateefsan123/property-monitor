import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useReducedMotion from './use-reduced-motion';

export default function BottomSheet({ visible, onClose, onDismiss, children, colors }) {
  const { height: screenHeight } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [presented, setPresented] = useState(visible);
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const dismiss = useRef(onDismiss);
  const wasPresented = useRef(presented);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  if (visible && !presented) setPresented(true);

  useEffect(() => {
    if (!presented) return;
    progress.stopAnimation();
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? 260 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setPresented(false);
    });
    return () => animation.stop();
  }, [progress, visible, presented, reduced]);

  // iOS supplies its native dismissal callback. Android/web need one after
  // the hidden Modal commits, so a document picker can safely open next.
  useEffect(() => {
    const dismissed = wasPresented.current && !presented;
    wasPresented.current = presented;
    if (dismissed && Platform.OS !== 'ios') dismiss.current?.();
  }, [presented]);

  return (
    <Modal
      visible={presented}
      transparent
      animationType="none"
      onRequestClose={visible ? onClose : undefined}
      onDismiss={Platform.OS === 'ios' ? () => { if (!visible) onDismiss?.(); } : undefined}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)', opacity: progress }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" style={StyleSheet.absoluteFill} onPress={visible ? onClose : undefined} />
        <Animated.View
          // Stop taps on the sheet body from bubbling up to the backdrop
          accessibilityViewIsModal
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            s.sheet,
            {
              maxHeight: screenHeight * 0.85,
              backgroundColor: colors.bgCard,
              borderTopColor: colors.border,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [screenHeight, 0] }) }],
            },
          ]}
        >
          <View style={s.handleWrap}>
            <View style={[s.handle, { backgroundColor: colors.textFainter }]} />
          </View>
          {children}
          {/* Reserve space for the Android nav bar / iOS home indicator so
              content isn't hidden behind them when the Modal draws edge-to-edge */}
          <View style={{ height: insets.bottom }} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,

  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
