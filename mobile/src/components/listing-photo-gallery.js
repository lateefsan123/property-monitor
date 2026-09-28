import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

export default function ListingPhotoGallery({ photos, colors }) {
  const scroll = useRef(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  if (!photos.length) return null;
  const go = next => {
    setIndex(next);
    scroll.current?.scrollTo({ x: next * width, animated: true });
  };
  return <View onLayout={event => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth(nextWidth);
    scroll.current?.scrollTo({ x: index * nextWidth, animated: false });
  }} style={{ height: 240, backgroundColor: colors.bgCard }}>
    {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled directionalLockEnabled showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={event => setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}>
      {photos.map((uri, position) => <Image key={uri} source={{ uri }} accessibilityLabel={`Listing photo ${position + 1} of ${photos.length}`} resizeMode="cover" style={{ width, height: 240 }} />)}
    </ScrollView>}
    {photos.length > 1 && <View style={{ position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous photo" disabled={index === 0} onPress={() => go(index - 1)} style={{ padding: 12, opacity: index === 0 ? 0.3 : 1 }}><Text style={{ color: '#fff' }}>‹</Text></Pressable>
      <Text accessibilityLiveRegion="polite" style={{ color: '#fff', fontSize: 12 }}>{index + 1} / {photos.length}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next photo" disabled={index === photos.length - 1} onPress={() => go(index + 1)} style={{ padding: 12, opacity: index === photos.length - 1 ? 0.3 : 1 }}><Text style={{ color: '#fff' }}>›</Text></Pressable>
    </View>}
  </View>;
}
