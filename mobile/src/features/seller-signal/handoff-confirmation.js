import { Alert, Platform } from 'react-native';
import { handoffConfirmation } from '../../../../shared/whatsapp-send-policy.js';

// Shown after opening WhatsApp or copying a message; the native alert is still
// waiting when the person switches back from WhatsApp.
export function confirmHandoffSent(names, onConfirm) {
  const { title, body, confirm, cancel } = handoffConfirmation(names);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${body}`)) onConfirm();
    return;
  }
  Alert.alert(title, body, [{ text: cancel, style: 'cancel' }, { text: confirm, onPress: onConfirm }]);
}
