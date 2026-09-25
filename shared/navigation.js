export const TOP_NAVIGATION = [
  { id: "home", label: "Home", icon: "home", kind: "nav" },
  { id: "search", label: "Search", icon: "search", kind: "disabled" },
  { id: "new", label: "New", icon: "plus", kind: "action" },
];
export const MAIN_NAVIGATION = [
  { id: "sellers", label: "Sellers", icon: "users", kind: "nav" },
  { id: "listing-alerts", label: "Listings", icon: "building", kind: "nav" },
  { id: "spreadsheets", label: "Spreadsheets", icon: "table", kind: "nav" },
  {
    id: "message-template",
    label: "Message template",
    icon: "message",
    kind: "action",
  },
];
export const FOOTER_NAVIGATION = [
  { id: "settings", label: "Settings", icon: "settings", kind: "action" },
  { id: "signout", label: "Sign out", icon: "logout", kind: "action" },
];
export const PAGE_LABELS = Object.fromEntries(
  [...TOP_NAVIGATION, ...MAIN_NAVIGATION, ...FOOTER_NAVIGATION].map((item) => [
    item.id,
    item.label,
  ]),
);
