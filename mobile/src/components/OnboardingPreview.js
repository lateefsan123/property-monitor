import { Text, View, useWindowDimensions } from 'react-native';
import AppIcon from './AppIcon';
import LeadCard from '../features/seller-signal/components/LeadCard';
import { PriceChart } from '../screens/ListingDetailScreen';

const noop = () => {};
const history = [
  { at: '2026-09-01', price: 2400000, type: 'new' },
  { at: '2026-09-12', price: 2250000, type: 'price_drop' },
  { at: '2026-09-24', price: 2100000, type: 'price_drop' },
];
const sampleSellers = [
  { id: 'demo-1', name: 'Sarah Ahmed', building: 'Marina Heights', bedroom: '2BR', unit: '1203', statusLabel: 'Appraisal', statusRule: { id: 'market_appraisal' }, dueLabel: 'Due today', isDue: true },
  { id: 'demo-2', name: 'James Wilson', building: 'Downtown Views', bedroom: '1BR', statusLabel: 'Prospect', statusRule: { id: 'prospect' }, dueLabel: 'In 7 days', isDue: false },
];
function Label({ children, colors }) { return <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}>{children}</Text>; }
export default function OnboardingPreview({ step, colors: c }) {
  const { width } = useWindowDimensions();
  const previewWidth = Math.min(350, width - 48);
  return <View aria-hidden pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: previewWidth, gap: 12 }}>
    <View style={{ borderRadius: 22, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard, overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.07)' }}>
      <View style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{['Sellers', 'Marina Heights', 'Schedule'][step]}</Text><AppIcon name={['users', 'building', 'calendar'][step]} size={20} color={c.textMuted} /></View>
      {step === 0 ? <View style={{ paddingHorizontal: 18 }}>
        {sampleSellers.map((lead, index) => <View key={lead.id} style={{ paddingVertical: 16, borderTopWidth: index ? 1 : 0, borderTopColor: c.border }}><LeadCard lead={lead} colors={c} insight={{ message: 'Example message' }} favorite={index === 0} pinned={false} onPress={noop} onPin={noop} onFavorite={noop} onCopyMessage={noop} /></View>)}
      </View> : step === 1 ? <View style={{ paddingTop: 16, gap: 7 }}>
        <View style={{ paddingHorizontal: 18, gap: 6 }}><Label colors={c}>2 bed / 1,400 sqft</Label><Text style={{ color: c.textName, fontSize: 27, fontWeight: '700' }}>AED 2.1M</Text><Text style={{ color: c.badgeOkText, fontSize: 12, fontWeight: '600' }}>Down AED 300K</Text></View>
        <PriceChart colors={c} width={previewWidth - 2} priceHistory={history} />
      </View> : <View style={{ padding: 18, gap: 18 }}>
        <View style={{ gap: 12 }}><Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Marina Heights</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <View key={index} style={{ width: 31, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: index === 1 || index === 4 ? c.tabActiveBg : c.bgBadge }}><Text style={{ color: index === 1 || index === 4 ? c.tabActiveText : c.textMuted, fontSize: 12, fontWeight: '600' }}>{day}</Text></View>)}</View></View>
        <View style={{ borderRadius: 15, backgroundColor: c.bgMsg, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><AppIcon name="whatsapp" size={16} color={c.textMuted} /><Label colors={c}>Message preview</Label></View><Text style={{ color: c.text, fontSize: 14, lineHeight: 21 }}>Hi Sarah, a similar apartment in Marina Heights just sold. Would you like an updated appraisal?</Text></View>
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><AppIcon name="checkCircle" size={16} color={c.badgeOkText} /><Label colors={c}>Your buildings. Your schedule.</Label></View>
      </View>}
    </View>
    <Text style={{ color: c.textFaint, fontSize: 10, textAlign: 'center' }}>Example data</Text>
  </View>;
}
