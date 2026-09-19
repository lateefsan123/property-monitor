import { useEffect, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";



export default function BottomSheet({ visible, onClose, onDismiss, children, colors }) {
  const { height: screenHeight } = useWindowDimensions();
  const [translateY] = useState(() => new Animated.Value(screenHeight));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY, visible, screenHeight]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={onDismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          // Stop taps on the sheet body from bubbling up to the backdrop
          accessibilityViewIsModal
          style={[
            s.sheet,
            {
              maxHeight: screenHeight * 0.85,
              backgroundColor: colors.bgCard,
              borderTopColor: colors.border,
              transform: [{ translateY }],
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
