import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { TABS } from '../coordinatorConstants';
import type { Tab } from '../coordinatorTypes';
import { AutoRefreshBadge } from './CoordinatorControls';

type Props = ComponentProps<typeof AutoRefreshBadge> & {
  hideTabs?: boolean;
  pendingCount: number;
  salesPeopleCount: number;
  onTabChange: (tab: Tab) => void;
  onSync: () => void;
};
const labels: Record<Tab, string> = { today: 'Today', responses: 'Verified', tasks: 'Sales tasks', assign: 'Assign lead', assignedLeads: 'Assigned leads' };

export function MobileWorkspaceHeader({ pendingCount, salesPeopleCount, onTabChange, onSync, hideTabs = false, ...refresh }: Props) {
  const disabled = refresh.refreshing || refresh.submitting;
  return <View style={mobile.header}>
    <View style={mobile.summary}>
      <View style={[mobile.stat, mobile.review]}><Icon source="clipboard-clock-outline" size={17} color="#4F46E5" /><View style={mobile.statCopy}><Text style={mobile.value}>{pendingCount}</Text><Text style={mobile.label}>To review</Text></View></View>
      <View style={[mobile.stat, mobile.people]}><Icon source="account-group-outline" size={17} color="#0F766E" /><View style={mobile.statCopy}><Text style={mobile.value}>{salesPeopleCount}</Text><Text style={mobile.label}>Sales people</Text></View></View>

      <Pressable accessibilityRole="button" accessibilityLabel="Sync coordinator data" hitSlop={6} disabled={disabled} onPress={onSync} style={[mobile.sync, disabled && { opacity: 0.5 }]}><Icon source="refresh" size={18} color="#3156C8" /></Pressable>
      <AutoRefreshBadge {...refresh} countOnly />
    </View>
    {!hideTabs ? <View style={mobile.tabs}>
      {TABS.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: refresh.tab === item.key }} onPress={() => onTabChange(item.key)} style={[mobile.tab, (item.key === 'assign' || item.key === 'assignedLeads') && mobile.wideTab, refresh.tab === item.key && mobile.activeTab]}><Icon source={item.icon} size={15} color={refresh.tab === item.key ? '#FFFFFF' : '#52627C'} /><Text style={[mobile.tabText, refresh.tab === item.key && mobile.activeText]}>{labels[item.key]}</Text></Pressable>)}
    </View> : null}
  </View>;
}
const mobile = StyleSheet.create({
  header: { gap: 7, minWidth: 0 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  review: { backgroundColor: '#EEF2FF', borderColor: '#DDE2FF' },
  people: { backgroundColor: '#ECFDF5', borderColor: '#C9EDE3' },
  statCopy: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  value: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#172B50' },
  label: { fontSize: 10, lineHeight: 14, color: '#52627C', fontWeight: '600' },
  syncRow: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 },
  sync: { width: 32, minHeight: 32, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  syncText: { color: '#3156C8', fontSize: 13, fontWeight: '700' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wideTab: { flexBasis: '47%' },
  tab: { flexBasis: '30%', flexGrow: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 5, borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE3EF' },
  activeTab: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#52627C' },
  activeText: { color: '#FFFFFF' },
});
