import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
export function MobileDetailSection({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={section.box}><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={section.header}><Text style={section.title}>{title}</Text><Icon source={open ? 'chevron-up' : 'chevron-down'} size={18} color="#526685" /></Pressable>{open ? <View style={section.body}>{children}</View> : null}</View>;
}
const section = StyleSheet.create({ box: { borderWidth: 1, borderColor: '#DFE7F4', borderRadius: 10, backgroundColor: '#FFFFFF', overflow: 'hidden' }, header: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, gap: 8, backgroundColor: '#F3F6FF' }, title: { flex: 1, color: '#28447F', fontSize: 12, fontWeight: '700' }, body: { padding: 8, gap: 8 } });
