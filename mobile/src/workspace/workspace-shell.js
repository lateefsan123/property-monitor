import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import NavigationDrawer from "./navigation-drawer";
import WorkspaceHome from "./home";
import WorkspaceSettings from "./settings";
import MessageTemplatesScreen from "./message-templates-screen";
import WorkspaceSpreadsheets from "./spreadsheets";
import DashboardScreen from "../screens/DashboardScreen";
import ListingAlertsScreen from "../screens/ListingAlertsScreen";
import BottomSheet from "../components/BottomSheet";
import { fetchLeadSources } from "../features/seller-signal/services";
import { leadSourcesQueryKey } from "../features/seller-signal/useSellerSignalPage";
import { useWorkspacePreference } from "./preferences";
import { getTheme } from "../theme";
import { supabase } from "../supabase";
import { Button, Feedback } from "./ui";
import VoicePanel from './voice-panel';

export default function WorkspaceShell({
  userId,
  displayName,
  theme,
  onToggleTheme,
  ...accountProps
}) {
  const colors = getTheme(theme);
  const [page, setPage] = useState("home");
  const [listingHeader, setListingHeader] = useState(null);
  const [settingsHeader, setSettingsHeader] = useState(null);
  const pendingShortcut = useRef(null);
  const finishShortcutDismiss = useCallback(() => {
    const run = pendingShortcut.current;
    pendingShortcut.current = null;
    run?.();
  }, []);
  const [requests, setRequests] = useState({});
  const [visited, setVisited] = useState(["home"]);
  const [createOpen, setCreateOpen] = useState(false);
  const [signoutOpen, setSignoutOpen] = useState(false);
  const [signoutError, setSignoutError] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const favorites = useWorkspacePreference(userId, "sheet-favorites", []);
  const sources = useQuery({
    queryKey: leadSourcesQueryKey(userId),
    queryFn: () => fetchLeadSources(userId),
    enabled: Boolean(userId),
  });
  const navigate = useCallback((id, request) => {
    setPage(id);
    setVisited((previous) =>
      previous.includes(id) ? previous : [...previous, id],
    );
    if (request)
      setRequests((previous) => ({
        ...previous,
        [id]: { ...request, key: Date.now() },
      }));
  }, []);
  useEffect(() => {
    if (!createOpen && Platform.OS !== "ios") finishShortcutDismiss();
  }, [createOpen, finishShortcutDismiss]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (createOpen) {
        setCreateOpen(false);
        return true;
      }
      if (page === "listing-alerts" || page === "settings") return false;
      if (page !== "home") {
        setPage("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [page, createOpen]);
  function action(id) {
    if (id === "new") setCreateOpen(true);
    else if (id === "signout") setSignoutOpen(true);
    else if (id.startsWith("source:"))
      navigate("spreadsheets", { sourceId: id.slice(7) });
    else navigate(id);
  }
  const common = { userId, displayName, theme, colors, onNavigate: navigate };
  const contextualHeader = page === "listing-alerts" ? listingHeader : page === "settings" ? settingsHeader : null;
  return (
    <NavigationDrawer
      page={page}
      headerTitle={contextualHeader?.title}
      onHeaderBack={contextualHeader?.onBack}
      hideCreate={page === "spreadsheets" || Boolean(contextualHeader?.onBack)}
      colors={colors}
      onNavigate={navigate}
      onAction={action}
      onToggleTheme={onToggleTheme}
      favorites={(sources.data || []).filter((source) =>
        favorites.value.includes(String(source.id)),
      )}
    >
      {visited.map((id) => (
        <View
          key={id}
          style={{ flex: 1, display: page === id ? "flex" : "none" }}
          accessibilityElementsHidden={page !== id}
          importantForAccessibility={
            page === id ? "auto" : "no-hide-descendants"
          }
        >
          {id === "home" ? (
            <WorkspaceHome {...common} />
          ) : id === "sellers" ? (
            <DashboardScreen {...common} embedded request={requests[id]} />
          ) : id === "spreadsheets" ? (
            <WorkspaceSpreadsheets {...common} request={requests[id]} />
          ) : id === "listing-alerts" ? (
            <ListingAlertsScreen {...common} onHeaderChange={setListingHeader} active={page === id} onExit={() => navigate("home")} embedded request={requests[id]} />
          ) : id === "message-template" ? (
            <MessageTemplatesScreen {...common} />
          ) : (
            <WorkspaceSettings
              onHeaderChange={setSettingsHeader}
              onExit={() => navigate("home")}
              active={page === id}
              {...common}
              {...accountProps}
              onToggleTheme={onToggleTheme}
            />
          )}
        </View>
      ))}
      <VoicePanel key={userId} userId={userId} colors={colors} />
      <BottomSheet
        visible={createOpen}
        onDismiss={finishShortcutDismiss}
        onClose={() => setCreateOpen(false)}
        colors={colors}
      >
        <View style={{ padding: 20, gap: 10 }}>
          <Text
            style={{ color: colors.textName, fontSize: 20, fontWeight: "700" }}
          >
            Quick actions
          </Text>
          {[
            ["Sellers", "sellers", { add: false }],
            ["Search listings", "listing-alerts", { search: true }],
            ["Import spreadsheet", "spreadsheets", { add: true }],
            ["Message template", "message-template", {}],
          ].map(([label, destination, request]) => (
            <Button
              key={label}
              colors={colors}
              onPress={() => {
                pendingShortcut.current = () => navigate(destination, request);
                setCreateOpen(false);
              }}
            >
              {label}
            </Button>
          ))}
        </View>
      </BottomSheet>
      <BottomSheet
        visible={signoutOpen}
        onClose={() => !signingOut && setSignoutOpen(false)}
        colors={colors}
      >
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ color: colors.text }}>Sign out of Repeat AI?</Text>
          <Feedback colors={colors} error={signoutError} />
          <Button
            colors={colors}
            disabled={signingOut}
            onPress={async () => {
              setSigningOut(true);
              setSignoutError(null);
              try {
                const { error } = await supabase.auth.signOut({ scope: "local" });
                if (error) throw error;
              } catch (error) {
                setSignoutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
              } finally {
                setSigningOut(false);
              }
            }}
          >
            Sign out
          </Button>
          <Button
            colors={colors}
            disabled={signingOut}
            onPress={() => setSignoutOpen(false)}
          >
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </NavigationDrawer>
  );
}
