import AppSearchBar from "../components/AppSearchBar";
import LeadCard from "../features/seller-signal/components/LeadCard";
import { getBuildingKeyVariants } from "../features/seller-signal/lead-utils";
import buildingImages from "../data/building-images.json";
import { Button, Field } from "../workspace/ui";
import { useWorkspacePreference } from "../workspace/preferences";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Line, Path } from "react-native-svg";
import BottomSheet from "../components/BottomSheet";
import AddSellerSheet from "../features/seller-signal/components/AddSellerSheet";
import LeadImportEmptyState from "../features/seller-signal/components/LeadImportEmptyState";
import LeadDetailSheet from "../features/seller-signal/components/LeadDetailSheet";
import Pagination from "../features/seller-signal/components/Pagination";
import { DATA_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../features/seller-signal/constants";
import { useSellerSignalPage } from "../features/seller-signal/useSellerSignalPage";
import { getTheme } from "../theme";

export default function DashboardScreen({ onBack, theme, userId, embedded = false, request }) {
  const d = useSellerSignalPage(userId);
  const colors = getTheme(theme);
  const s = styles(colors);
  const insets = useSafeAreaInsets();

  const favorites = useWorkspacePreference(userId, "seller-favorites", []);
  const pins = useWorkspacePreference(userId, "seller-pins", []);
  const views = useWorkspacePreference(userId, "seller-views", []);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const bottomInset = embedded ? 0 : insets.bottom;
  const [sendBarHeight, setSendBarHeight] = useState(68 + bottomInset);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addSellerOpen, setAddSellerOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const lastRequest = useRef(null);
  useEffect(() => { if (lastRequest.current === request) return; lastRequest.current = request; if (request?.sourceId) d.actions.selectSourceFilter(request.sourceId); if (request?.add) setAddSellerOpen(true); }, [request, d.actions]);
  const toggle = (preference, id) => !preference.pending && preference.set(preference.value.includes(String(id)) ? preference.value.filter(value => value !== String(id)) : [...preference.value, String(id)]);
  const canAddSeller = d.sourceFilter && d.sourceFilter !== "all" && d.sourceFilter !== "legacy";
  const activeSourceLabel = canAddSeller
    ? (d.sourceOptions.find((option) => option.id === d.sourceFilter)?.label || "")
    : "";
  const selectedLead = useMemo(
    () => d.leads.find((lead) => lead.id === selectedLeadId) || null,
    [d.leads, selectedLeadId],
  );

  function restoreView(filters) {
    d.actions.selectSourceFilter(filters.sourceFilter || "all");
    d.actions.selectStatusFilter(filters.statusFilter || "all");
    d.actions.selectViewTab(filters.viewTab || "active");
    d.actions.selectDataFilter(filters.dataFilter || "all");
    d.actions.selectDataQualityFilter(filters.dataQualityFilter || "all");
    d.actions.updateSearchTerm(filters.searchTerm || "");
    setSheetOpen(false);
  }

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -60 && d.viewTab === "active") {
            d.actions.selectViewTab("done");
          } else if (gesture.dx > 60 && d.viewTab === "done") {
            d.actions.selectViewTab("active");
          }
        },
      }),
    [d.actions, d.viewTab],
  );

  if (d.loading) {
    return (
      <SafeAreaView style={s.page}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (!d.hasLeads) {
    return (
      <SafeAreaView style={s.page} edges={embedded ? [] : ["top"]}>
        {onBack ? (
          <Pressable style={s.emptyBackBtn} onPress={onBack} hitSlop={12}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Line x1="19" y1="12" x2="5" y2="12" />
              <Path d="M12 19l-7-7 7-7" />
            </Svg>
          </Pressable>
        ) : null}
        <LeadImportEmptyState
          error={d.error}
          importing={d.importing}
          onImport={d.actions.importFromSheet}
          onSheetUrlChange={d.actions.updateSheetUrl}
          sheetUrl={d.sheetUrl}
          colors={colors}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.page} edges={embedded ? [] : ["top"]}>
      <View style={s.tabBar}>
        {onBack ? (
          <Pressable style={s.backBtn} onPress={onBack} hitSlop={12}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Line x1="19" y1="12" x2="5" y2="12" />
              <Path d="M12 19l-7-7 7-7" />
            </Svg>
          </Pressable>
        ) : null}

        <View style={s.pillTrack}>
          {[
            { id: "active", label: `Due today ${d.activeLeads.length}` },
            { id: "done", label: `Scheduled ${d.doneLeads.length}` },
          ].map((tab) => {
            const isActive = d.viewTab === tab.id;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{selected:isActive}}
                key={tab.id}
                style={[s.pillTab, isActive && s.pillTabActive]}
                onPress={() => d.actions.selectViewTab(tab.id)}
              >
                <Text style={[s.pillTabLabel, isActive && s.pillTabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

      </View>

      <View style={s.searchBar}>
        <AppSearchBar
          colors={colors}
          placeholder="Search sellers"
          accessibilityLabel="Search sellers"
          clearLabel="Clear seller search"
          value={d.searchTerm}
          onChangeText={d.actions.updateSearchTerm}
        />
      </View>

      {d.notice && (
        <View style={s.successBox}>
          <Text style={s.successText}>{d.notice}</Text>
        </View>
      )}

      {d.error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{d.error}</Text>
        </View>
      )}

      <View style={s.listWrap} {...swipeResponder.panHandlers}>
        <FlatList
          data={d.pagedLeads}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <LeadCard buildingImageUrl={buildingImages[getBuildingKeyVariants(item.resolvedBuilding || item.building).find(key => buildingImages[key])]} lead={item} insight={d.insights[item.id]} colors={colors} onPress={lead => setSelectedLeadId(lead.id)} isSent={Boolean(d.sentLeads[item.id])} messageTemplate={d.messageTemplate} copiedLeadId={d.copiedLeadId} onCopyMessage={d.actions.copyMessage} onSendWhatsApp={d.actions.sendWhatsAppLead} onToggleSent={d.actions.toggleSent} whatsappConnected={Boolean(d.connectedWhatsAppAccount)} favorite={favorites.value.includes(String(item.id))} pinned={pins.value.includes(String(item.id))} onFavorite={() => toggle(favorites,item.id)} onPin={() => toggle(pins,item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: colors.textFainter }]} />}
          ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: 32 }}>No sellers match your search or filters.</Text>}
          ListFooterComponent={
            d.totalPages > 1 ? (
              <Pagination
                currentPage={d.safePage}
                onNext={d.actions.goToNextPage}
                onPrevious={d.actions.goToPreviousPage}
                totalPages={d.totalPages}
                colors={colors}
              />
            ) : null
          }
        />
      </View>

      <View onLayout={event => setSendBarHeight(event.nativeEvent.layout.height)} style={{ padding: 12, paddingBottom: Math.max(12, bottomInset), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgCard }}><Button colors={colors} primary disabled={!d.connectedWhatsAppAccount || !d.sendAllCount || sendingBulk} onPress={() => setConfirmSend(true)}>{sendingBulk ? 'Sending…' : `Send messages · ${d.sendAllCount} ready`}</Button></View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seller filters"
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [s.fab, { bottom: sendBarHeight + 16 }, pressed && { opacity: 0.85 }]}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6" />
        </Svg>
      </Pressable>
      <BottomSheet visible={confirmSend} onClose={() => !sendingBulk && setConfirmSend(false)} colors={colors}><View style={{ padding: 20, gap: 12 }}><Text style={{ color: colors.text }}>Send messages to {d.sendAllCount} sellers on this page using your connected WhatsApp account?</Text><Button colors={colors} disabled={sendingBulk} onPress={async () => { setSendingBulk(true); try { await d.actions.bulkWhatsApp(); } finally { setSendingBulk(false); setConfirmSend(false); } }}>Confirm send</Button><Button colors={colors} disabled={sendingBulk} onPress={() => setConfirmSend(false)}>Cancel</Button></View></BottomSheet>

      <LeadDetailSheet
        visible={Boolean(selectedLeadId && selectedLead)}
        onClose={() => setSelectedLeadId(null)}
        lead={selectedLead}
        insight={selectedLead ? d.insights[selectedLead.id] : null}
        messageTemplate={d.messageTemplate}
        editDraft={selectedLead && d.editingLeadId === selectedLead.id ? d.editingLeadDraft : null}
        isSent={selectedLead ? Boolean(d.sentLeads[selectedLead.id]) : false}
        isDeleting={selectedLead ? d.deletingLeadId === selectedLead.id : false}
        isEditing={selectedLead ? d.editingLeadId === selectedLead.id : false}
        isSaving={selectedLead ? d.savingLeadId === selectedLead.id : false}
        copiedLeadId={d.copiedLeadId}
        onCancelEditing={d.actions.cancelEditingLead}
        onCopyMessage={d.actions.copyMessage}
        onDelete={d.actions.deleteLead}
        onEditFieldChange={d.actions.updateLeadDraftField}
        onSaveEdit={d.actions.saveLeadEdits}
        onSaveNotes={d.actions.saveNotes}
        onSendWhatsApp={d.actions.sendWhatsAppLead}
        onStartEditing={d.actions.startEditingLead}
        onToggleSent={d.actions.toggleSent}
        onUpdateStatus={d.actions.updateLeadStatus}
        whatsappConnected={Boolean(d.connectedWhatsAppAccount)}
        colors={colors}
      />

      <BottomSheet visible={addSellerOpen && !canAddSeller} onClose={() => setAddSellerOpen(false)} colors={colors}><ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}><Text style={{ color: colors.text }}>Choose a spreadsheet for this seller</Text>{d.sourceOptions.filter(item => item.id !== 'legacy').map(item => <Button key={item.id} colors={colors} onPress={() => d.actions.selectSourceFilter(item.id)}>{item.label}</Button>)}<Button colors={colors} onPress={() => setAddSellerOpen(false)}>Cancel</Button></ScrollView></BottomSheet>
      <AddSellerSheet
        visible={addSellerOpen && canAddSeller}
        onClose={() => setAddSellerOpen(false)}
        onSubmit={d.actions.addLead}
        submitting={d.addingLead}
        sourceLabel={activeSourceLabel}
        colors={colors}
      />

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} colors={colors}>
        <ScrollView keyboardShouldPersistTaps="handled" style={s.sheetScroll} contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={{flexDirection:'row',gap:8,marginBottom:16}}><Button colors={colors} onPress={() => setSheetOpen(false)}>Done</Button><Button colors={colors} onPress={() => {d.actions.selectStatusFilter('all');d.actions.selectDataFilter('all');d.actions.selectDataQualityFilter('all');}}>Reset filters</Button></View><Button colors={colors} onPress={() => d.actions.selectSort(d.sort === 'alpha' ? 'priority' : 'alpha')}>{d.sort === 'alpha' ? 'Name A–Z' : 'Priority order'}</Button><Button colors={colors} primary={d.dataQualityFilter === 'review'} onPress={() => d.actions.selectDataQualityFilter(d.dataQualityFilter === 'review' ? 'all' : 'review')}>Needs review</Button><Text style={s.sectionLabel}>Status</Text>
          <View style={s.chipRow}>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[s.chip, (Array.isArray(d.statusFilter) ? d.statusFilter.includes(option.id) : d.statusFilter === option.id) && s.chipActive]}
                onPress={() => {const selected = Array.isArray(d.statusFilter) ? d.statusFilter : d.statusFilter === 'all' ? [] : [d.statusFilter]; const next = selected.includes(option.id) ? selected.filter(id=>id!==option.id) : [...selected,option.id];d.actions.selectStatusFilter(next.length ? next : 'all');}}
              >
                <Text style={[s.chipText, (Array.isArray(d.statusFilter) ? d.statusFilter.includes(option.id) : d.statusFilter === option.id) && s.chipTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          {d.sourceOptions.length ? (
            <>
              <Text style={s.sectionLabel}>Spreadsheet</Text>
              <View style={s.chipRow}>
                <Pressable
                  style={[s.chip, d.sourceFilter === "all" && s.chipActive]}
                  onPress={() => d.actions.selectSourceFilter("all")}
                >
                  <Text style={[s.chipText, d.sourceFilter === "all" && s.chipTextActive]}>All</Text>
                </Pressable>
                {d.sourceOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[s.chip, d.sourceFilter === option.id && s.chipActive]}
                    onPress={() => d.actions.selectSourceFilter(option.id)}
                  >
                    <Text style={[s.chipText, d.sourceFilter === option.id && s.chipTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Text style={s.sectionLabel}>Data</Text>
          <View style={s.chipRow}>
            {DATA_FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[s.chip, d.dataFilter === option.id && s.chipActive]}
                onPress={() => d.actions.selectDataFilter(option.id)}
              >
                <Text style={[s.chipText, d.dataFilter === option.id && s.chipTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Button colors={colors} onPress={() => setViewsOpen(!viewsOpen)}>
            {viewsOpen ? "Hide saved views" : "Saved views"}
          </Button>
          {viewsOpen ? (
            <View style={{ gap: 10 }}>
              {[
                ["All due", {}],
                ["Needs review", { dataQualityFilter: "review" }],
                ["Has market data", { dataFilter: "with_data" }],
                ["Appraisals", { statusFilter: "market_appraisal" }],
                ["Scheduled", { viewTab: "done" }],
              ].map(([name, filters]) => (
                <Button key={name} colors={colors} onPress={() => restoreView(filters)}>{name}</Button>
              ))}
              {views.value.map(view => (
                <View key={view.id} style={{ flexDirection: "row", gap: 8 }}>
                  <Button colors={colors} style={{ flex: 1 }} onPress={() => restoreView(view.filters)}>{view.name}</Button>
                  <Button colors={colors} accessibilityLabel={`Remove saved view ${view.name}`} disabled={views.pending} onPress={() => views.set(views.value.filter(item => item.id !== view.id))}>Remove</Button>
                </View>
              ))}
              <Field colors={colors} label="View name" value={viewName} onChangeText={setViewName} />
              <Button colors={colors} disabled={!viewName.trim() || views.pending} onPress={() => {
                views.set([...views.value, {
                  id: String(Date.now()),
                  name: viewName.trim(),
                  filters: {
                    sourceFilter: d.sourceFilter,
                    statusFilter: d.statusFilter,
                    dataFilter: d.dataFilter,
                    dataQualityFilter: d.dataQualityFilter,
                    viewTab: d.viewTab,
                    searchTerm: d.searchTerm,
                  },
                }]);
                setViewName("");
              }}>Save current view</Button>
              {views.error ? <Text style={{ color: colors.errorText }}>{views.error.message}</Text> : null}
            </View>
          ) : null}

        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = (c) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    tabBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.bg,
      position: "relative",
    },
    backBtn: {
      position: "absolute",
      left: 16,
      top: 10,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyBackBtn: {
      position: "absolute",
      top: 12,
      left: 12,
      zIndex: 10,
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    pillTrack: {
      flexDirection: "row",
      backgroundColor: c.bgCard,
      borderRadius: 24,
      padding: 3,
    },
    pillTab: {
      minWidth: 100,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 22,
    },
    pillTabActive: { backgroundColor: c.tabActiveBg },
    pillTabLabel: { fontSize: 14, fontWeight: "600", color: c.textMuted },
    pillTabLabelActive: { color: c.tabActiveText },
    errorBox: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
      borderRadius: 10,
      padding: 10,
    },
    errorText: { color: c.errorText, fontSize: 13 },
    successBox: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: c.badgeOkBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 10,
    },
    successText: { color: c.badgeOkText, fontSize: 13 },
    searchBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    listWrap: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 100 },
    separator: { height: StyleSheet.hairlineWidth, marginVertical: 18, marginHorizontal: -16 },
    fab: {
      position: "absolute",
      bottom: 44,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      zIndex: 10,
      backgroundColor: c.textName,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    sheetScroll: { maxHeight: 500 },
    sheetContent: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 4,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: c.bgBadge,
    },
    chipActive: { backgroundColor: c.tabActiveBg },
    chipText: { fontSize: 13, fontWeight: "600", color: c.textMuted },
    chipTextActive: { color: c.tabActiveText },
    toggleSection: { gap: 12 },
    toggleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toggleLabel: { fontSize: 15, color: c.text },
  });
