import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import { Button } from '../../../workspace/ui';
import { STATUS_FILTER_OPTIONS } from '../constants';

function Section({ title, summary, colors: c, children }) {
  const [open, setOpen] = useState(false);
  return <View style={{ borderBottomWidth: 1, borderBottomColor: c.border }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${summary}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={{ minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>{title}</Text><Text style={{ color: c.textMuted, fontSize: 13 }} numberOfLines={2}>{summary}</Text></View>
      <AppIcon name={open ? 'arrowDown' : 'chevron'} size={18} color={c.textMuted} />
    </Pressable>
    {open && <View style={{ paddingBottom: 18, gap: 12 }}>{children}</View>}
  </View>;
}
function Choices({ options, selected, onChange, colors: c }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map(option => {
    const active = Array.isArray(selected) ? selected.includes(option.id) : selected === option.id;
    return <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onChange(option.id)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: active ? c.tabActiveBg : c.bgBadge }}><Text style={{ color: active ? c.tabActiveText : c.text, fontSize: 14 }}>{option.label}</Text></Pressable>;
  })}</View>;
}
export default function SellerFilters({ data: d, colors: c, onClose, savedViews, onReset }) {
  const statuses = Array.isArray(d.statusFilter) ? d.statusFilter : d.statusFilter === 'all' ? [] : [d.statusFilter];
  const statusSummary = statuses.length ? STATUS_FILTER_OPTIONS.filter(option => statuses.includes(option.id)).map(option => option.label).join(', ') : 'All statuses';
  const sourceSummary = d.sourceOptions.find(option => option.id === d.sourceFilter)?.label || 'All spreadsheets';
  const dataSummary = d.dataFilter === 'with_data' ? 'With market data' : d.dataFilter === 'no_data' ? 'Without market data' : 'Any availability';
  return <>
    <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: c.text, fontSize: 22, fontWeight: '700' }}>Filters</Text><Pressable accessibilityRole="button" onPress={onReset} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={{ color: c.textMuted, fontWeight: '600' }}>Reset all</Text></Pressable></View>
    <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
      <Section title="Status" summary={statusSummary} colors={c}><Choices colors={c} options={[{ id: 'all', label: 'All statuses' }, ...STATUS_FILTER_OPTIONS]} selected={statuses.length ? statuses : 'all'} onChange={id => {
        const next = statuses.includes(id) ? statuses.filter(value => value !== id) : [...statuses, id];
        d.actions.selectStatusFilter(id === 'all' || !next.length ? 'all' : next);
      }} /></Section>
      {d.sourceOptions.length > 0 && <Section title="Spreadsheet" summary={sourceSummary} colors={c}><Choices colors={c} options={[{ id: 'all', label: 'All spreadsheets' }, ...d.sourceOptions]} selected={d.sourceFilter} onChange={d.actions.selectSourceFilter} /></Section>}
      <Section title="Favourites" summary={d.favoritesOnly ? 'Starred sellers only' : 'All sellers'} colors={c}>
        <Text style={{ color: c.textMuted, lineHeight: 20 }}>Star a seller to find them here later.</Text>
        <Choices colors={c} options={[{ id: false, label: 'All sellers' }, { id: true, label: 'Starred only' }]} selected={Boolean(d.favoritesOnly)} onChange={d.actions.selectFavoritesOnly} />
      </Section>
      <Section title="Sort by" summary={d.sort === 'alpha' ? 'Name A-Z' : 'Default order'} colors={c}>
        <Choices colors={c} options={[{ id: 'priority', label: 'Default order' }, { id: 'alpha', label: 'Name A-Z' }]} selected={d.sort} onChange={d.actions.selectSort} />
        <Text style={{ color: c.textMuted, lineHeight: 20 }}>Pinned sellers stay at the top in either order.</Text>
      </Section>
      <Section title="More filters" summary={[d.dataQualityFilter === 'review' ? 'Needs review' : null, d.dataFilter !== 'all' ? dataSummary : null].filter(Boolean).join(' / ') || 'Data quality and market data'} colors={c}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: c.text, fontWeight: '600' }}>Needs review</Text><Text style={{ color: c.textMuted, lineHeight: 20 }}>Only sellers with flagged contact or property details.</Text></View><Switch accessibilityLabel="Only sellers needing review" value={d.dataQualityFilter === 'review'} onValueChange={value => d.actions.selectDataQualityFilter(value ? 'review' : 'all')} /></View>
        <Text style={{ color: c.text, fontWeight: '600', marginTop: 8 }}>Market data</Text>
        <Choices colors={c} options={[{ id: 'all', label: 'Any' }, { id: 'with_data', label: 'Available' }, { id: 'no_data', label: 'Unavailable' }]} selected={d.dataFilter} onChange={d.actions.selectDataFilter} />
      </Section>
      <Section title="Saved views" summary="Reuse a filter selection" colors={c}>{savedViews}</Section>
    </ScrollView>
    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: c.border }}><Button colors={c} primary onPress={onClose}>Show sellers{d.filteredLeads ? ` (${d.filteredLeads.length})` : ''}</Button></View>
  </>;
}
