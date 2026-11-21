import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';

export function CrmAssignedToDropdown({ value, options, onChange }: {
  value: string; options: readonly string[]; onChange: (value: string) => void;
}) {
  const anchor = useRef<View>(null);
  const { width, height } = useWindowDimensions();
  const [position, setPosition] = useState<{ x: number; y: number; width: number } | null>(null);
  const [search, setSearch] = useState('');
  const close = () => { setPosition(null); setSearch(''); };
  const select = (name: string) => { onChange(name); close(); };
  const menuWidth = Math.min(Math.max(position?.width ?? 0, 240), width - 24);
  const menuHeight = Math.min(300, height - 24);
  return <View ref={anchor} collapsable={false} style={styles.root}>
    <Pressable accessibilityRole="button" accessibilityLabel="Filter assigned clients by employee"
      accessibilityState={{ expanded: position !== null }}
      onPress={() => anchor.current?.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        setPosition({ x, y: y + measuredHeight + 8, width: measuredWidth });
      })} style={({ pressed }) => [styles.trigger, position !== null && styles.triggerOpen, pressed && styles.pressed]}>
      <Icon source="account-outline" size={16} color="#5670A6" />
      <Text numberOfLines={1} style={styles.value}>{value || 'All assigned to'}</Text>
      <Icon source={position ? 'chevron-up' : 'chevron-down'} size={18} color="#3156C8" />
    </Pressable>
    <Modal transparent visible={position !== null} animationType="fade" onRequestClose={close}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close employee filter" style={styles.backdrop} onPress={close} />
      <View accessibilityViewIsModal style={[styles.menu, {
        width: menuWidth, maxHeight: menuHeight,
        left: Math.max(12, Math.min(position?.x ?? 12, width - menuWidth - 12)),
        top: Math.max(12, Math.min(position?.y ?? 12, height - menuHeight - 12)),
      }]}>
        <View style={styles.searchRow}>
          <Icon source="magnify" size={19} color="#64748B" />
          <TextInput accessibilityLabel="Search assigned employee" value={search} onChangeText={setSearch}
            placeholder="Search employee" placeholderTextColor="#94A3B8" style={styles.search} />
          <Pressable accessibilityRole="button" accessibilityLabel="Close employee dropdown" onPress={close} hitSlop={8}>
            <Icon source="close" size={18} color="#64748B" />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: Math.max(70, menuHeight - 60) }}>
          {['', ...options.filter(name => name.toLowerCase().includes(search.trim().toLowerCase()))].map(name => {
            const selected = name === value;
            return <Pressable key={name || 'all'} accessibilityRole="button" accessibilityState={{ selected }}
              accessibilityLabel={name || 'All assigned to'} onPress={() => select(name)}
              style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
              <Text style={[styles.optionText, selected && styles.selectedText]}>{name || 'All assigned to'}</Text>
              {selected ? <Icon source="check" size={18} color="#3156C8" /> : null}
            </Pressable>;
          })}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { width: 190, flexShrink: 1 },
  trigger: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D6E0F5' },
  triggerOpen: { borderColor: '#91A7F9', backgroundColor: '#F6F8FF' },
  value: { flex: 1, color: '#28447F', fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  menu: { position: 'absolute', padding: 6, borderWidth: 1, borderColor: '#DFE6F5', borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#172B50', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 4, marginBottom: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: '#F3F6FC' },
  search: { flex: 1, minHeight: 32, fontSize: 12, color: '#203761' },
  option: { minHeight: 34, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  selected: { backgroundColor: '#EEF2FF' },
  optionText: { flex: 1, fontSize: 12, color: '#334155', fontWeight: '600' },
  selectedText: { color: '#28447F', fontWeight: '800' },
});
