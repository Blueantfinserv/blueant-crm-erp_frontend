import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { styles as workspaceStyles } from '../../salesCoordinatorStyles';

// A local confirmation gate only; no backend request or persisted unlock state.
const EXPORT_PASSWORD = '140302';

export function VerifiedMeetingsExportButton({ disabled, compact, onExport }: { disabled: boolean; compact: boolean; onExport: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const opened = useRef(false);
  const close = () => { opened.current = false; setOpen(false); setPassword(''); setError(''); };
  const requestExport = () => {
    if (disabled) return;
    opened.current = true; setPassword(''); setError(''); setOpen(true);
  };
  const confirm = () => {
    if (!opened.current || disabled) return;
    if (password !== EXPORT_PASSWORD) { setError('Incorrect password. Please try again.'); return; }
    close();
    onExport();
  };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Export verified meetings to Excel" accessibilityHint="Enter the export password to download matching verified meetings" disabled={disabled} onPress={requestExport} style={({ pressed }) => [workspaceStyles.assignedExportButton, compact && { width: 32, height: 32 }, disabled && workspaceStyles.disabled, pressed && workspaceStyles.pressed]}><Icon source="file-excel-outline" size={compact ? 17 : 20} color="#FFFFFF" /></Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close export password" onPress={close} style={styles.close}><Icon source="close" size={22} color="#64748B" /></Pressable>
          <View style={styles.icon}><Icon source="file-excel-outline" size={26} color="#15803D" /></View>
          <Text style={styles.title}>Export Verified Meetings</Text>
          <Text style={styles.note}>Enter the password to download the file.</Text>
          <TextInput accessibilityLabel="Export password" autoFocus secureTextEntry value={password} onChangeText={value => { setPassword(value); setError(''); }} onSubmitEditing={confirm} placeholder="Password" placeholderTextColor="#94A3B8" autoCapitalize="none" autoCorrect={false} style={styles.input} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={close} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Confirm Excel export" disabled={disabled} onPress={confirm} style={[styles.confirm, disabled && workspaceStyles.disabled]}><Icon source="download" size={18} color="#FFFFFF" /><Text style={styles.confirmText}>Download</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.55)' },
  dialog: { width: '100%', maxWidth: 370, padding: 24, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 12 },
  close: { position: 'absolute', top: 12, right: 12, padding: 5, zIndex: 1 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#172033', fontSize: 19, fontWeight: '800' },
  note: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  input: { height: 46, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, color: '#172033', fontSize: 16 },
  error: { color: '#B91C1C', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancel: { paddingHorizontal: 15, minHeight: 42, justifyContent: 'center', borderRadius: 9, backgroundColor: '#F1F5F9' },
  cancelText: { color: '#475569', fontWeight: '700' },
  confirm: { paddingHorizontal: 15, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 9, backgroundColor: '#15803D' },
  confirmText: { color: '#FFFFFF', fontWeight: '800' },
});
