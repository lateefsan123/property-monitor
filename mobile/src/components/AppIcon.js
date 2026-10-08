import Ionicons from "@expo/vector-icons/Ionicons";

const names = {
  calendar: "calendar-outline", menu: "menu-outline", close: "close-outline",
  closeCircle: "close-circle", home: "home-outline", search: "search-outline",
  pinFilled: "pin", starFilled: "star",
  pin: "pin-outline", plus: "add-outline", voice: "pulse-outline",
  arrowUp: "arrow-up-outline", arrowDown: "arrow-down-outline", stop: "stop",
  mic: "mic-outline", micOff: "mic-off-outline", users: "people-outline",
  person: "person-outline", building: "business-outline", table: "grid-outline",
  message: "chatbubble-outline", settings: "settings-outline", logout: "log-out-outline",
  moon: "moon-outline", sun: "sunny-outline", back: "arrow-back-outline",
  filter: "options-outline", chevron: "chevron-forward-outline", chevronBack: "chevron-back-outline",
  star: "star-outline", phone: "call-outline", whatsapp: "logo-whatsapp",
  copy: "copy-outline", check: "checkmark-outline", checkCircle: "checkmark-circle-outline", checkCircleFilled: "checkmark-circle", circle: "ellipse-outline", circleSkipped: "remove-circle-outline",
  external: "open-outline", location: "location-outline", chart: "stats-chart-outline",
  activity: "pulse-outline", flash: "flash-outline", document: "document-text-outline",
  download: "download-outline", notification: "notifications-outline", card: "card-outline",
  refresh: "refresh-outline", trash: "trash-outline", link: "link-outline",
  more: "ellipsis-horizontal-outline",
  tag: "pricetag-outline",
  edit: "create-outline",
  apple: "logo-apple",
  mail: "mail-outline",
  alert: "warning-outline",
};

// A bundled icon font, rendered as native text. Button labels belong to the
// surrounding control so screen readers do not announce decorative glyphs.
export default function AppIcon({ name, color = "#64748b", size = 20 }) {
  return (
    <Ionicons
      name={names[name] || "help-circle-outline"}
      size={size}
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      allowFontScaling={false}
      style={{ width: size, height: size, lineHeight: size, textAlign: "center", includeFontPadding: false }}
    />
  );
}
