import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import BottomSheet from "../components/BottomSheet";
import { Button, Field } from "./ui";
import { useWorkspacePreference } from "./preferences";

const statuses = [
  ["prospect", "Prospects"],
  ["market_appraisal", "Appraisals"],
  ["for_sale_available", "For sale"],
  ["not_interested", "Not interested"],
];
export default function SellerToolbar({ d, colors, userId, onAdd, compact = false, onFilters }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const views = useWorkspacePreference(userId, "seller-views", []);
  const source = d.sourceOptions.find((item) => item.id === d.sourceFilter);
  const selectedStatuses = Array.isArray(d.statusFilter)
    ? d.statusFilter
    : d.statusFilter === "all"
      ? []
      : [d.statusFilter];
  function restore(filters) {
    d.actions.selectSourceFilter(filters.sourceFilter || "all");
    d.actions.selectStatusFilter(filters.statusFilter || "all");
    d.actions.selectViewTab(filters.viewTab || "active");
    d.actions.selectDataFilter(filters.dataFilter || "all");
    d.actions.selectDataQualityFilter(filters.dataQualityFilter || "all");
    d.actions.updateSearchTerm(filters.searchTerm || "");
    setViewsOpen(false);
  }
  return (
    <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
      {compact ? <View style={{flexDirection:"row",gap:8}}><Button colors={colors} style={{flex:1}} onPress={() => setSourcesOpen(true)}>{source?.label || "All spreadsheets"}</Button><Button colors={colors} onPress={() => setViewsOpen(true)}>Views</Button><Button colors={colors} icon="filter" onPress={onFilters}>Filters</Button></View> : <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          colors={colors}
          onPress={() => setSourcesOpen(true)}
          style={{ flex: 1 }}
        >
          {source?.label || "All spreadsheets"}
        </Button>
        <Button
          colors={colors}
          icon="plus"
          accessibilityLabel="Add seller"
          onPress={onAdd}
        >
          Add seller
        </Button>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button colors={colors} onPress={() => setViewsOpen(true)}>
          Saved views
        </Button>
        <Button
          colors={colors}
          onPress={() =>
            d.actions.selectSort(d.sort === "alpha" ? "priority" : "alpha")
          }
        >
          {d.sort === "alpha" ? "Name A–Z" : "Priority"}
        </Button>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {statuses.map(([id, label]) => (
          <Button
            colors={colors}
            primary={selectedStatuses.includes(id)}
            key={id}
            onPress={() => {
              const next = selectedStatuses.includes(id)
                ? selectedStatuses.filter((value) => value !== id)
                : [...selectedStatuses, id];
              d.actions.selectStatusFilter(next.length ? next : "all");
            }}
          >
            {label}
          </Button>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        <Button
          colors={colors}
          primary={d.dataQualityFilter === "review"}
          onPress={() =>
            d.actions.selectDataQualityFilter(
              d.dataQualityFilter === "review" ? "all" : "review",
            )
          }
        >
          Needs review
        </Button>
        <Button
          colors={colors}
          primary={d.dataFilter === "with_data"}
          onPress={() =>
            d.actions.selectDataFilter(
              d.dataFilter === "with_data" ? "all" : "with_data",
            )
          }
        >
          Has market data
        </Button>
      </ScrollView>
      </>}
      <BottomSheet
        visible={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        colors={colors}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
          <Text
            style={{ color: colors.textName, fontSize: 19, fontWeight: "700" }}
          >
            Spreadsheets
          </Text>
          {[{ id: "all", label: "All spreadsheets" }, ...d.sourceOptions].map(
            (item) => (
              <Button
                colors={colors}
                primary={d.sourceFilter === item.id}
                key={item.id}
                onPress={() => {
                  d.actions.selectSourceFilter(item.id);
                  setSourcesOpen(false);
                }}
              >
                {item.label}
              </Button>
            ),
          )}
        </ScrollView>
      </BottomSheet>
      <BottomSheet
        visible={viewsOpen}
        onClose={() => setViewsOpen(false)}
        colors={colors}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 10 }}
        >
          <Text
            style={{ color: colors.textName, fontSize: 19, fontWeight: "700" }}
          >
            Saved views
          </Text>
          {[
            ["All due", {}],
            ["Needs review", { dataQualityFilter: "review" }],
            ["Has market data", { dataFilter: "with_data" }],
            ["Appraisals", { statusFilter: "market_appraisal" }],
            ["Scheduled", { viewTab: "done" }],
          ].map(([name, filters]) => (
            <Button key={name} colors={colors} onPress={() => restore(filters)}>
              {name}
            </Button>
          ))}
          {views.value.map((view) => (
            <View key={view.id} style={{ flexDirection: "row", gap: 8 }}>
              <Button
                colors={colors}
                style={{ flex: 1 }}
                onPress={() => restore(view.filters)}
              >
                {view.name}
              </Button>
              <Button
                colors={colors}
                accessibilityLabel={`Remove saved view ${view.name}`}
                disabled={views.pending}
                onPress={() =>
                  views.set(views.value.filter((item) => item.id !== view.id))
                }
              >
                Remove
              </Button>
            </View>
          ))}
          <Field
            colors={colors}
            label="View name"
            value={viewName}
            onChangeText={setViewName}
          />
          <Button
            colors={colors}
            disabled={!viewName.trim() || views.pending}
            onPress={() => {
              views.set([
                ...views.value,
                {
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
                },
              ]);
              setViewName("");
            }}
          >
            Save current view
          </Button>
          {views.error && (
            <Text style={{ color: colors.errorText }}>
              {views.error.message}
            </Text>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
