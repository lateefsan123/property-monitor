import AddButton from '../components/AddButton';
/* global require */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image, useImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MAIN_NAVIGATION as BASE_MAIN_NAVIGATION,
  TOP_NAVIGATION,
  FOOTER_NAVIGATION,
  PAGE_LABELS,
} from "../../../shared/navigation";
import { Icon } from "./ui";
const MAIN_NAVIGATION = [...BASE_MAIN_NAVIGATION, { id: "schedule", label: "Schedule", icon: "calendar", kind: "nav" }];
const NAVIGATION_LOGO = require("../../assets/repeat-ai-logo.png");

// Keep the drawer in the same native view so a swipe can move it continuously.
export default function NavigationDrawer({
  page,
  headerTitle,
  onHeaderBack,
  hideCreate = false,
  onNavigate,
  onAction,
  colors,
  children,
  favorites = [],
  favoriteSellers = [],
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Decode both themed variants before the drawer opens, retaining native image
  // references so opening the modal or changing theme does not reload the logo.
  const lightLogo = useImage(NAVIGATION_LOGO, { maxWidth: 540, tintColor: "#111111" });
  const darkLogo = useImage(NAVIGATION_LOGO, { maxWidth: 540, tintColor: "#ffffff" });
  const logo = colors.isDark ? darkLogo : lightLogo;
  const drawerWidth = Math.min(320, width * 0.86);
  const [open, setOpen] = useState(false);
  const pendingAction = useRef(null);
  const finishDismiss = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);
  useEffect(() => {
    if (!open) finishDismiss();
  }, [open, finishDismiss]);
  const [slide] = useState(() => new Animated.Value(-drawerWidth));
  const close = useCallback(() => {
    Animated.timing(slide, {
      toValue: -drawerWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  }, [drawerWidth, slide]);
  const show = useCallback(() => {
    setOpen(true);
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [slide]);
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [open, close]);
  const edgeGesture = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !open && (!onHeaderBack || g.x0 <= 24) &&
        g.dx > 12 && Math.abs(g.dy) < Math.abs(g.dx) / 2,
      onPanResponderGrant: () => {
        if (!onHeaderBack) { slide.stopAnimation(); setOpen(true); }
      },
      onPanResponderMove: (_, g) => {
        if (!onHeaderBack) slide.setValue(Math.min(0, Math.max(-drawerWidth, g.dx - drawerWidth)));
      },
      onPanResponderRelease: (_, g) => {
        if (onHeaderBack) {
          if (g.dx > 35 && Math.abs(g.dy) < Math.abs(g.dx) / 2) onHeaderBack();
        } else if (g.vx > 0.45 || (g.vx > -0.45 && g.dx > drawerWidth * 0.3)) show();
        else close();
      },
      onPanResponderTerminate: () => { if (!onHeaderBack) close(); },
      onPanResponderTerminationRequest: () => false,
    }),
    [open, onHeaderBack, slide, drawerWidth, show, close],
  );
  const dismissGesture = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -12 && Math.abs(g.dy) < Math.abs(g.dx) / 2,
      onPanResponderGrant: () => slide.stopAnimation(),
      onPanResponderMove: (_, g) => slide.setValue(Math.max(-drawerWidth, Math.min(0, g.dx))),
      onPanResponderRelease: (_, g) => {
        if (g.vx < -0.45 || (g.vx < 0.45 && g.dx < -drawerWidth * 0.3)) close();
        else show();
      },
      onPanResponderTerminate: show,
    }),
    [slide, drawerWidth, close, show],
  );
  function activate(item) {
    pendingAction.current = () => {
      if (item.kind === "nav") onNavigate(item.id);
      else onAction(item.id);
    };
    close();
  }
  function row(item) {
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{
          selected: page === item.id,
          disabled: item.kind === "disabled",
        }}
        disabled={item.kind === "disabled"}
        onPress={() => activate(item)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          minHeight: 46,
          marginHorizontal: 10,
          paddingHorizontal: 13,
          borderRadius: 7,
          opacity: item.kind === "disabled" ? 0.4 : 1,
          backgroundColor:
            pressed || page === item.id ? colors.bgHover : "transparent",
        })}
      >
        <Icon
          name={item.icon}
          color={page === item.id ? colors.textName : colors.navText}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.text,
            fontWeight: page === item.id ? "600" : "400",
          }}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  }
  return (
    <View
      {...edgeGesture.panHandlers}
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flex: 1 }} aria-hidden={open} accessibilityElementsHidden={open} importantForAccessibility={open ? "no-hide-descendants" : "auto"}>
      <View
        style={{
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          gap: 6,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onHeaderBack ? "Go back" : "Open navigation"}
          onPress={onHeaderBack || show}
          style={{ padding: 12 }}
        >
          <Icon name={onHeaderBack ? "back" : "menu"} color={colors.textMuted} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 15, color: colors.text }}
        >
          {headerTitle || PAGE_LABELS[page] || "Home"}
        </Text>
        {!hideCreate && <AddButton colors={colors} accessibilityLabel="Quick actions" onPress={() => onAction("new")} />}

      </View>
      <View style={{ flex: 1 }}>{children}</View>
      </View>
      <View
        pointerEvents={open ? "auto" : "none"}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "yes" : "no-hide-descendants"}
        style={{ display: open ? "flex" : "none", position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <View style={{ flex: 1 }}>
          <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#000", opacity: slide.interpolate({ inputRange: [-drawerWidth, 0], outputRange: [0, 0.34], extrapolate: "clamp" }) }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation"
            onPress={close}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,

            }}
          />
          <Animated.View
            accessibilityViewIsModal
            {...dismissGesture.panHandlers}
            style={{
              width: drawerWidth,
              flex: 1,
              backgroundColor: colors.navBg,
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 10,
              transform: [{ translateX: slide }],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 18,
              }}
            >
              <Image
                source={logo ?? NAVIGATION_LOGO}
                tintColor={colors.isDark ? "#ffffff" : "#111111"}
                accessibilityLabel="Repeat AI"
                contentFit="contain"
                transition={0}
                style={{ width: 180, height: 34, flexShrink: 0 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close navigation"
                onPress={close}
                style={{ padding: 12 }}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View>{TOP_NAVIGATION.filter((item) => item.kind !== "disabled").map(row)}</View>
              {favorites.length > 0 && (
                <View>
                  {favorites.map((source) =>
                    row({
                      id: `source:${source.id}`,
                      label: source.label || source.building_name,
                      icon: "table",
                      kind: "action",
                    }),
                  )}
                </View>
              )}
              {favoriteSellers.length > 0 && <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600", paddingHorizontal: 23, paddingBottom: 4 }}>Saved sellers</Text>
                {favoriteSellers.map(seller => row({ id: `seller:${seller.id}`, label: seller.name || "Unnamed seller", icon: "starFilled", kind: "action" }))}
              </View>}
              <View>{MAIN_NAVIGATION.map(row)}</View>
            </ScrollView>
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 10,
              }}
            >
              {FOOTER_NAVIGATION.map(row)}
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
