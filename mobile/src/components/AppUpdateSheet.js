import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon';
import BottomSheet from './BottomSheet';
import { SettingsToggle } from './SettingsLayout';

const COPY = {
  updateAvailable: 'Update available',
  updateReady: 'Update ready',
  quickRefresh: 'A quick refresh',
  updateApp: 'Update app',
  restartApp: 'Restart app',
  downloadUpdate: 'Download update',
  storeDescription: version => `Repeat AI ${version} is ready. Get the latest improvements from the App Store.`,
  readyDescription: 'The latest improvements are downloaded. Restart when you’re ready.',
  downloadDescription: 'Small improvements are ready to download. You can keep using the app.',
  automaticUpdates: 'Automatic updates',
  automaticCaption: 'Download small updates in the background. Apply on next launch.',
  pleaseWait: 'Please wait…',
  later: 'Later',
};

/** Same sheet as FighterCenter: icon, title, description, automatic toggle, one button and a quiet Later. */
export default function AppUpdateSheet({ visible, kind, version, ready, highlights = [], automatic, onAutomaticChange,
  automaticSupported = true, busy, error, onClose, onUpdate, colors, onDismiss }) {
  const title = kind === 'store' ? COPY.updateAvailable : ready ? COPY.updateReady : COPY.quickRefresh;
  const action = kind === 'store' ? COPY.updateApp : ready ? COPY.restartApp : COPY.downloadUpdate;
  return (
    <BottomSheet visible={visible} onClose={onClose} onDismiss={onDismiss} colors={colors}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.icon, { backgroundColor: colors.bgBadge }]}>
          <AppIcon name={ready ? 'check' : 'arrowDown'} size={26} color={colors.text} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {kind === 'store' ? COPY.storeDescription(version ?? '') : ready ? COPY.readyDescription : COPY.downloadDescription}
        </Text>
        {highlights.length > 0 ? <View style={styles.highlights}>
          {highlights.map((text, index) => <View key={index} style={styles.highlight}>
            <AppIcon name="check" size={18} color={colors.textMuted} />
            <Text style={[styles.highlightText, { color: colors.text }]}>{text}</Text>
          </View>)}
        </View> : null}
        {automaticSupported ? <View style={[styles.preference, { borderColor: colors.border }]}>
          <Text style={[styles.preferenceTitle, { color: colors.text }]}>{COPY.automaticUpdates}</Text>
          <SettingsToggle colors={colors} accessibilityLabel={COPY.automaticUpdates} accessibilityHint={COPY.automaticCaption}
            value={automatic} onValueChange={onAutomaticChange} />
        </View> : null}
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.errorText }]}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={onUpdate}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.btnPrimaryBg, opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}>
          <Text style={[styles.buttonText, { color: colors.btnPrimaryText }]}>{busy ? COPY.pleaseWait : action}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.later}>
          <Text style={[styles.laterText, { color: colors.textMuted }]}>{COPY.later}</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 4, alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'center' },
  highlights: { alignSelf: 'stretch', gap: 10, marginTop: 22 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  highlightText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  preference: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 22, minHeight: 56, paddingHorizontal: 16, borderWidth: 1, borderRadius: 16 },
  preferenceTitle: { fontSize: 15, fontWeight: '700' },
  error: { alignSelf: 'stretch', fontSize: 13, lineHeight: 19, marginTop: 14, textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  later: { minHeight: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  laterText: { fontSize: 15, fontWeight: '700' },
});
