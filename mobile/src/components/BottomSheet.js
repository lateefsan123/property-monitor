import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function BottomSheet({ visible, onClose, children, colors }) {
  const [translateY] = useState(() => new Animated.Value(SCREEN_HEIGHT));
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
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Animated.View
          // Stop taps on the sheet body from bubbling up to the backdrop
          onStartShouldSetResponder={() => true}
          style={[
            s.sheet,
            {
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
      </Pressable>
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
    maxHeight: SCREEN_HEIGHT * 0.8,
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
