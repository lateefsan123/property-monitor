import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { hexToHsv, hsvToHex, hueToHex, normalizeHex } from "../../../shared/color.js";

// Mobile copy of web's ColorPicker (src/components/ColorPicker.jsx), after
// Play's "New Color" sheet: shade/brightness square, hue bar, hex, swatches.
// Drawn with react-native-svg so it ships without a native rebuild.
const HUE_STOPS = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"];

// Touch handlers for a draggable area: x and y as 0-1 of its laid-out size.
function dragHandlers(size, onMove) {
  const point = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    onMove(
      Math.min(1, Math.max(0, locationX / Math.max(1, size.width))),
      Math.min(1, Math.max(0, locationY / Math.max(1, size.height))),
    );
  };
  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: point,
    onResponderMove: point,
  };
}

function Thumb({ x, y, color }) {
  return <View pointerEvents="none" style={{ position: "absolute", left: x - 12, top: y - 12, width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: "#fff", backgroundColor: color, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 }} />;
}

export default function ColorPicker({ value, onChange, swatches = [], colors }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hexText, setHexText] = useState((normalizeHex(value) || "#3b82f6").slice(1).toUpperCase());
  const [square, setSquare] = useState({ width: 0, height: 180 });
  const [bar, setBar] = useState({ width: 0 });
  const hex = hsvToHex(hsv);

  function update(next) {
    const merged = { ...hsv, ...next };
    const nextHex = hsvToHex(merged);
    setHsv(merged);
    setHexText(nextHex.slice(1).toUpperCase());
    onChange(nextHex);
  }

  const squareDrag = dragHandlers(square, (x, y) => update({ s: x, v: 1 - y }));
  const hueDrag = dragHandlers({ width: bar.width, height: 28 }, (x) => update({ h: x * 360 }));

  return (
    <View style={{ gap: 16 }}>
      <View {...squareDrag} onLayout={(event) => setSquare(event.nativeEvent.layout)}
        accessibilityLabel="Shade and brightness" style={{ height: 180, borderRadius: 12, overflow: "hidden" }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="cpkWhite" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="1" stopColor={hueToHex(hsv.h)} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="cpkBlack" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cpkWhite)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#cpkBlack)" />
        </Svg>
        {square.width ? <Thumb x={hsv.s * square.width} y={(1 - hsv.v) * square.height} color={hex} /> : null}
      </View>
      <View {...hueDrag} onLayout={(event) => setBar(event.nativeEvent.layout)}
        accessibilityLabel="Hue" style={{ height: 28, justifyContent: "center" }}>
        <View style={{ height: 16, borderRadius: 8, overflow: "hidden" }}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="cpkHue" x1="0" y1="0" x2="1" y2="0">
                {HUE_STOPS.map((stop, index) => <Stop key={index} offset={index / (HUE_STOPS.length - 1)} stopColor={stop} />)}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#cpkHue)" />
          </Svg>
        </View>
        {bar.width ? <Thumb x={(hsv.h / 360) * bar.width} y={14} color={hueToHex(hsv.h)} /> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4, height: 42, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.bgBadge }}>
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>#</Text>
          <TextInput value={hexText} maxLength={6} autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Hex colour"
            onChangeText={(text) => {
              const clean = text.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
              setHexText(clean);
              const next = normalizeHex(clean);
              if (next && clean.length === 6) { setHsv(hexToHsv(next)); onChange(next); }
            }}
            onBlur={() => setHexText(hex.slice(1).toUpperCase())}
            style={{ flex: 1, color: colors.text, fontSize: 16, letterSpacing: 1, fontVariant: ["tabular-nums"] }} />
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: hex }} />
      </View>
      {swatches.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {swatches.map((swatch) => (
            <Pressable key={swatch} accessibilityRole="radio" accessibilityState={{ checked: hex === swatch }} accessibilityLabel={swatch}
              onPress={() => { setHsv(hexToHsv(swatch)); setHexText(swatch.slice(1).toUpperCase()); onChange(swatch); }}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: swatch, borderWidth: 3, borderColor: hex === swatch ? colors.textName : "transparent" }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
