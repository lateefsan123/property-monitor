import { Pressable, Text, View } from 'react-native';
import AppIcon from '../components/AppIcon';
import WhatsAppConnectionArt from '../components/WhatsAppConnectionArt';

export default function WhatsAppOverview({ colors, connected, phoneLabel, waiting, onManage, onPair }) {
  return <View style={{ gap: 28, paddingTop: 12 }}>
    {connected ? <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>Linked number</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Manage WhatsApp number, ${phoneLabel}`} onPress={onManage} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, backgroundColor: colors.bgCard, opacity: pressed ? 0.6 : 1 })}>
        <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.badgeOkBg }}><AppIcon name="whatsapp" size={25} color={colors.badgeOkText} /></View>
        <View style={{ flex: 1, gap: 6 }}><Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{phoneLabel}</Text><Text style={{ color: colors.badgeOkText, fontSize: 13 }}>Connected</Text></View>
        <AppIcon name="chevron" size={18} color={colors.textFaint} />
      </Pressable>
    </View> : <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, paddingTop: 32, alignItems: 'center', gap: 20 }}>
      <WhatsAppConnectionArt colors={colors} />
      <View style={{ gap: 8, alignItems: 'center' }}><Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>{waiting ? 'Finish linking WhatsApp' : 'Connect WhatsApp'}</Text><Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>{waiting ? 'Continue setup in WhatsApp.' : 'Use your number in Repeat AI.'}</Text></View>
      <Pressable accessibilityRole="button" onPress={onPair} style={({ pressed }) => ({ width: '100%', minHeight: 48, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.btnPrimaryBg, opacity: pressed ? 0.7 : 1 })}><Text style={{ color: colors.btnPrimaryText, fontSize: 15, fontWeight: '600' }}>{waiting ? 'Continue linking' : 'Link a number'}</Text></Pressable>
    </View>}
  </View>;
}

