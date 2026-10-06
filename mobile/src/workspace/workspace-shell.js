import MotionScreen from '../components/MotionScreen';
import QuickActions from './quick-actions';
import { leadsQueryKey } from "../features/seller-signal/useHomeLeadSummary";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import NavigationDrawer from "./navigation-drawer";
import WorkspaceHome from "./home";
import ScheduleScreen from "./schedule-screen";
import ActivityScreen from "./activity-screen";
import WorkspaceSettings from "./settings";
import MessageTemplatesScreen from "./message-templates-screen";
import WorkspaceSpreadsheets from "./spreadsheets";
import DashboardScreen from "../screens/DashboardScreen";
import ListingAlertsScreen from "../screens/ListingAlertsScreen";
import BottomSheet from "../components/BottomSheet";
import { fetchLeadSources, fetchUserLeads } from "../features/seller-signal/services";
import { leadSourcesQueryKey } from "../features/seller-signal/useSellerSignalPage";
import { useWorkspacePreference } from "./preferences";
import { getTheme } from "../theme";
import { supabase } from "../supabase";
import { Button, Feedback } from "./ui";
import VoicePanel from './voice-panel';
import { integrationStatusOptions } from '../../../src/integration-query';
import { integrationRequest } from './integration-client';

export default function WorkspaceShell({
  userId,
  displayName,
  theme,
  onToggleTheme,
  initialDestination,
  ...accountProps
}) {
  const colors = getTheme(theme);
  // Start before Settings opens; the panel shares this account-scoped request.
  useQuery(integrationStatusOptions(userId, integrationRequest));
  const [sellerSendBarHeight, setSellerSendBarHeight] = useState(76);
  const [assistantRequest, setAssistantRequest] = useState(null);
  const [page, setPage] = useState(initialDestination?.page || "home");
  const [listingFooterHeight, setListingFooterHeight] = useState(0);
  const [listingHeader, setListingHeader] = useState(null);
  const [settingsHeader, setSettingsHeader] = useState(null);
  const pendingShortcut = useRef(null);
  const finishShortcutDismiss = useCallback(() => {
    const run = pendingShortcut.current;
    pendingShortcut.current = null;
    run?.();
  }, []);
  const [requests, setRequests] = useState(() => initialDestination?.request ? { [initialDestination.page]: { ...initialDestination.request, key: Date.now() } } : {});
  const [visited, setVisited] = useState(() => [...new Set(["home", initialDestination?.page || "home"])]);
  const [createOpen, setCreateOpen] = useState(false);
  const [signoutOpen, setSignoutOpen] = useState(false);
  const [signoutError, setSignoutError] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const favorites = useWorkspacePreference(userId, "sheet-favorites", []);
  const sellerFavorites = useWorkspacePreference(userId, "seller-favorites", []);
  const savedSellers = useQuery({
    queryKey: leadsQueryKey(userId),
    queryFn: () => fetchUserLeads(userId),
    enabled: Boolean(userId) && sellerFavorites.value.length > 0,
  });
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
    else if (id.startsWith("seller:"))
      navigate("sellers", { sellerId: id.slice(7) });
    else if (id.startsWith("source:"))
      navigate("spreadsheets", { sourceId: id.slice(7) });
    else navigate(id);
  }
  const common = { userId, displayName, theme, colors, onNavigate: navigate, onAskRepeat: prompt => setAssistantRequest({ prompt, key: Date.now() }) };
  const contextualHeader = page === "listing-alerts" ? listingHeader : page === "settings" ? settingsHeader : null;
  return (
    <NavigationDrawer
      userId={userId}
      page={page}
      headerTitle={page === "schedule" ? "Schedule" : page === "message-template" ? "Templates" : contextualHeader?.title}
      onHeaderBack={contextualHeader?.onBack}
      hideCreate={page === "message-template" || page === "settings" || page === "spreadsheets" || page === "schedule" || Boolean(contextualHeader?.onBack)}
      colors={colors}
      onNavigate={navigate}
      onAction={action}
      onToggleTheme={onToggleTheme}
      favoriteSellers={(savedSellers.data?.leads || []).filter(seller => sellerFavorites.value.includes(String(seller.id)))}
      favorites={(sources.data || []).filter((source) =>
        favorites.value.includes(String(source.id)),
      )}
    >
      {visited.map((id) => (
        <MotionScreen key={id} active={page === id}>
          {id === "home" ? (
            <WorkspaceHome {...common} active={page === id} />
          ) : id === "sellers" ? (
            <DashboardScreen {...common} embedded request={requests[id]} onSendBarHeightChange={setSellerSendBarHeight} />
          ) : id === "spreadsheets" ? (
            <WorkspaceSpreadsheets {...common} request={requests[id]} />
          ) : id === "listing-alerts" ? (
            <ListingAlertsScreen {...common} onFooterHeightChange={setListingFooterHeight} onHeaderChange={setListingHeader} active={page === id} onExit={() => navigate("home")} embedded request={requests[id]} />
          ) : id === "activity" ? (
            <ActivityScreen {...common} />
          ) : id === "schedule" ? (
            <ScheduleScreen {...common} />
          ) : id === "message-template" ? (
            <MessageTemplatesScreen {...common} />
          ) : (
            <WorkspaceSettings
              key={requests[id]?.key || 'settings'}
              request={requests[id]}
              onHeaderChange={setSettingsHeader}
              onExit={() => navigate("home")}
              active={page === id}
              {...common}
              {...accountProps}
              onToggleTheme={onToggleTheme}
            />
          )}
        </MotionScreen>
      ))}
      <VoicePanel request={assistantRequest} key={userId} userId={userId} colors={colors} hideLauncher={page === "settings" || page === "message-template"} launcherBottom={page === "sellers" ? sellerSendBarHeight + 16 : page === "schedule" ? 92 : page === "listing-alerts" ? listingFooterHeight + 16 : 16} />
      <BottomSheet
        visible={createOpen}
        onDismiss={finishShortcutDismiss}
        onClose={() => setCreateOpen(false)}
        colors={colors}
      >
        <QuickActions colors={colors} onClose={() => setCreateOpen(false)} onAction={(destination, request) => {
          pendingShortcut.current = () => navigate(destination, request);
          setCreateOpen(false);
        }} />
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
