import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Svg, Line, Path } from "react-native-svg";
import BottomSheet from "../components/BottomSheet";
import LeadImportEmptyState from "../features/seller-signal/components/LeadImportEmptyState";
import LeadCard from "../features/seller-signal/components/LeadCard";
import LeadDetailSheet from "../features/seller-signal/components/LeadDetailSheet";
import Pagination from "../features/seller-signal/components/Pagination";
import { DATA_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from "../features/seller-signal/constants";
import { getBuildingKeyVariants } from "../features/seller-signal/lead-utils";
import { useSellerSignalPage } from "../features/seller-signal/useSellerSignalPage";
import buildingImages from "../data/building-images.json";
import { supabase } from "../supabase";
import { getTheme } from "../theme";

export default function DashboardScreen({ onBack, theme, userId }) {
  const d = useSellerSignalPage(userId);
  const colors = getTheme(theme);
  const s = styles(colors);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const selectedLead = useMemo(
    () => d.leads.find((lead) => lead.id === selectedLeadId) || null,
    [d.leads, selectedLeadId],
  );

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
      <SafeAreaView style={s.page} edges={["top"]}>
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
          onSignOut={() => supabase.auth.signOut()}
          sheetUrl={d.sheetUrl}
          colors={colors}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.page} edges={["top"]}>
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
            { id: "active", label: "Active" },
            { id: "done", label: "Done" },
          ].map((tab) => {
            const isActive = d.viewTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[s.pillTab, isActive && s.pillTabActive]}
                onPress={() => d.actions.selectViewTab(tab.id)}
              >
                <Text style={[s.pillTabLabel, isActive && s.pillTabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.leadCount}>{d.filteredLeads.length} leads</Text>
      </View>

      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder="Search name, building, phone..."
          placeholderTextColor={colors.textFaint}
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
            <LeadCard
              buildingImageUrl={(() => {
                const match = getBuildingKeyVariants(item.building).find((key) => buildingImages[key]);
                return match ? buildingImages[match] : undefined;
              })()}
              isSent={Boolean(d.sentLeads[item.id])}
              isDone={d.viewTab === "done"}
              lead={item}
              insight={d.insights[item.id]}
              onPress={(lead) => setSelectedLeadId(lead.id)}
              copiedLeadId={d.copiedLeadId}
              onCopyMessage={d.actions.copyMessage}
              onToggleSent={d.actions.toggleSent}
              colors={colors}
            />
          )}
          ItemSeparatorComponent={() => <View style={[s.separator, { backgroundColor: colors.textFainter }]} />}
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

      <Pressable
        style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
        onPress={() => setSheetOpen(true)}
      >
        <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={colors.bg} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Line x1="4" y1="21" x2="4" y2="14" />
          <Line x1="4" y1="10" x2="4" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12" y2="3" />
          <Line x1="20" y1="21" x2="20" y2="16" />
          <Line x1="20" y1="12" x2="20" y2="3" />
          <Line x1="1" y1="14" x2="7" y2="14" />
          <Line x1="9" y1="8" x2="15" y2="8" />
          <Line x1="17" y1="16" x2="23" y2="16" />
        </Svg>
      </Pressable>

      <Pressable
        style={({ pressed }) => [s.fabSmall, pressed && { opacity: 0.85 }]}
        onPress={() => supabase.auth.signOut()}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.errorText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <Path d="M16 17l5-5-5-5" />
          <Line x1="21" y1="12" x2="9" y2="12" />
        </Svg>
      </Pressable>

      <LeadDetailSheet
        visible={Boolean(selectedLeadId && selectedLead)}
        onClose={() => setSelectedLeadId(null)}
        lead={selectedLead}
        insight={selectedLead ? d.insights[selectedLead.id] : null}
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
        onStartEditing={d.actions.startEditingLead}
        onToggleSent={d.actions.toggleSent}
        onUpdateStatus={d.actions.updateLeadStatus}
        colors={colors}
      />

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} colors={colors}>
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>Status</Text>
          <View style={s.chipRow}>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[s.chip, d.statusFilter === option.id && s.chipActive]}
                onPress={() => d.actions.selectStatusFilter(option.id)}
              >
                <Text style={[s.chipText, d.statusFilter === option.id && s.chipTextActive]}>{option.label}</Text>
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

          <View style={s.toggleSection}>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Due only</Text>
              <Switch
                value={d.showDueOnly}
                onValueChange={d.actions.setDueOnly}
                trackColor={{ false: colors.border, true: colors.tabActiveBg }}
              />
            </View>
          </View>
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
    leadCount: {
      position: "absolute",
      right: 16,
      fontSize: 12,
      color: c.textFaint,
    },
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
      paddingVertical: 10,
    },
    searchInput: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      backgroundColor: c.bgCard,
      color: c.text,
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
    fabSmall: {
      position: "absolute",
      bottom: 116,
      right: 26,
      width: 44,
      height: 44,
      borderRadius: 22,
      zIndex: 10,
      backgroundColor: c.errorBg,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
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
