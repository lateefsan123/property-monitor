import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabase';
import { saveProfile } from '../workspace/profile-service';
import { pickAvatarPhoto } from '../workspace/avatar-picker';

export default function EditProfileScreen({ userId, displayName = '', avatarUrl = '', colors, onClose }) {
  const [name, setName] = useState(displayName);
  const [photo, setPhoto] = useState(avatarUrl);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const changed = name.trim() !== displayName || photo !== avatarUrl;
  const backgroundColor = colors.isDark ? '#000000' : '#ffffff';
  const foreground = colors.isDark ? '#ffffff' : '#171717';

  function close() {
    if (busyRef.current) return;
    if (!changed) return onClose();
    Alert.alert('Discard changes?', 'Your profile changes haven’t been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  }

  async function pickPhoto(camera) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMenu(false);
    setError('');
    try {
      const picked = await pickAvatarPhoto(camera);
      if (picked) setPhoto(picked);
    } catch (failure) {
      setError(failure.message || 'Could not open that photo. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function save() {
    if (busyRef.current || !changed) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await saveProfile(supabase, userId, name, photo);
      onClose();
    } catch (failure) {
      setError(failure.message || 'Could not save your profile. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={menu ? () => setMenu(false) : close}>
    <SafeAreaProvider style={{ flex: 1, backgroundColor }}>
    <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} />
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={[s.pill, { backgroundColor: colors.bgBadge }]}><Text style={{ color: foreground }}>Cancel</Text></Pressable>
          <Text accessibilityRole="header" style={[s.title, { color: foreground }]}>Edit Profile</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Save profile" disabled={busy || !changed || !name.trim()} onPress={save} style={[s.pill, { backgroundColor: colors.bgBadge, opacity: busy || !changed || !name.trim() ? 0.45 : 1 }]}>{busy ? <ActivityIndicator size="small" color={foreground} /> : <Text style={{ color: foreground, fontWeight: '600' }}>Save</Text>}</Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <View style={s.photoArea}>
            <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={busy} onPress={() => setMenu(value => !value)} style={[s.photo, { backgroundColor: colors.bgBadge }]}>
              {photo ? <Image source={{ uri: photo }} style={s.photo} /> : <AppIcon name="person" size={64} color={colors.textMuted} />}
              <View style={[s.editBadge, { backgroundColor: colors.bgBadge, borderColor: backgroundColor }]}><AppIcon name="edit" size={15} color={foreground} /></View>
            </Pressable>
          </View>
          <Text style={[s.sectionTitle, { color: foreground }]}>Profile</Text>
          <View style={[s.field, { borderBottomColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Name</Text>
            <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} editable={!busy} maxLength={80} autoCapitalize="words" autoCorrect={false} textContentType="name" autoComplete="name" returnKeyType="done" onSubmitEditing={save} placeholder="Your name" placeholderTextColor={colors.textMuted} style={[s.input, { color: foreground }]} />
          </View>
          {error ? <Text accessibilityRole="alert" style={{ color: colors.errorText, marginTop: 16, lineHeight: 21 }}>{error}</Text> : null}
        </ScrollView>
        {menu ? <View style={StyleSheet.absoluteFill}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo options" onPress={() => setMenu(false)} style={StyleSheet.absoluteFill} />
          <View style={[s.menu, { backgroundColor: colors.bgBadge, borderColor: colors.border }]}>
            {[['Take Photo', () => pickPhoto(true)], ['Choose Photo', () => pickPhoto(false)], ...(photo ? [['Remove Photo', () => { setPhoto(''); setMenu(false); }]] : [])].map(([label, action]) => <Pressable key={label} accessibilityRole="button" onPress={action} style={[s.menuItem, { backgroundColor: colors.isDark ? '#30312f' : '#e9e9e9' }]}><Text style={{ color: label === 'Remove Photo' ? colors.errorText : foreground, fontSize: 16 }}>{label}</Text></Pressable>)}
          </View>
        </View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </SafeAreaProvider>
  </Modal>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  pill: { minWidth: 66, minHeight: 44, paddingHorizontal: 16, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  photoArea: { alignItems: 'center', marginTop: 12, marginBottom: 38 },
  photo: { width: 196, height: 196, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', right: 5, bottom: 5, width: 29, height: 29, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '700', marginBottom: 20 },
  field: { gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  input: { fontSize: 16, paddingVertical: 10, paddingHorizontal: 0, minHeight: 44 },
  menu: { position: 'absolute', top: 264, alignSelf: 'center', width: 238, padding: 14, borderRadius: 28, gap: 8, borderWidth: StyleSheet.hairlineWidth },
  menuItem: { minHeight: 46, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
