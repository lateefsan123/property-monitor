import { Image, View } from 'react-native';
import AppIcon from './AppIcon';
import repeatIcon from '../../assets/repeat-ai-icon.png';

// Native artwork keeps both marks sharp and adapts the connector to the theme.
export default function WhatsAppConnectionArt({ colors }) {
  return <View accessible accessibilityLabel="Connect Repeat AI with WhatsApp" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
    <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: '#000', transform: [{ rotate: '-7deg' }], overflow: 'hidden' }}>
      <Image source={repeatIcon} accessible={false} style={{ width: 76, height: 76 }} />
    </View>
    <View style={{ width: 24, height: 1, backgroundColor: colors.border }} />
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="link" size={17} color={colors.textMuted} /></View>
    <View style={{ width: 24, height: 1, backgroundColor: colors.border }} />
    <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: '#25D366', transform: [{ rotate: '7deg' }], alignItems: 'center', justifyContent: 'center' }}><AppIcon name="whatsapp" size={48} color="#fff" /></View>
  </View>;
}
