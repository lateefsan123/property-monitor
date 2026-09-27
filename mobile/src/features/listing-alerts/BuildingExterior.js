import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import AppIcon from '../../components/AppIcon';
import { getBuildingExterior } from './building-exteriors';
import { buildingExteriorAssets } from './building-exterior-assets';

export default function BuildingExterior({ building, colors, grid }) {
  const exterior = getBuildingExterior(building);
  const [failedAsset, setFailedAsset] = useState(null);
  const source = exterior && failedAsset !== exterior.asset && buildingExteriorAssets[exterior.asset];
  return (
    <View style={{ width: grid ? '100%' : 64, height: grid ? 160 : 64, borderRadius: grid ? 0 : 10, overflow: 'hidden', backgroundColor: colors.bgBadge, alignItems: 'center', justifyContent: 'center' }}>
      {source ? (
        <Image
          source={source}
          accessibilityLabel={exterior.label}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
          onError={() => setFailedAsset(exterior.asset)}
        />
      ) : <AppIcon name="home" size={grid ? 30 : 24} color={colors.textMuted} />}
      {source && grid && exterior.scope === 'complex' ? (
        <Text style={{ position: 'absolute', bottom: 6, left: 8, color: '#fff', backgroundColor: '#0009', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontSize: 11 }}>Complex view</Text>
      ) : null}
    </View>
  );
}
