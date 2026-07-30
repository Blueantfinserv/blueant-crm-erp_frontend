import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { DashboardListCard, DashboardListPeriod } from '../types/dashboard';

type Props = {
  list: DashboardListCard;
  userName: string;
  onBack: () => void;
};

const periods: readonly { key: DashboardListPeriod; label: string; color: string }[] = [
  { key: 'today', label: 'Today', color: '#2563EB' },
  { key: 'thisWeek', label: 'This Week', color: '#8B5CF6' },
  { key: 'thisMonth', label: 'This Month', color: '#F97316' },
];

const periodWeight: Record<DashboardListPeriod, number> = {
  today: 1,
  thisWeek: 2,
  thisMonth: 3,
};

const rowColors = [
  { accent: '#2563EB', background: '#F5F9FF', border: '#DBEAFE', soft: '#E8F0FF' },
  { accent: '#8B5CF6', background: '#FAF7FF', border: '#EDE9FE', soft: '#F1EAFF' },
  { accent: '#F97316', background: '#FFF9F4', border: '#FFEDD5', soft: '#FFF0E3' },
  { accent: '#16A34A', background: '#F5FCF7', border: '#DCFCE7', soft: '#E7F8EC' },
] as const;

export function DashboardListScreen({ list, userName, onBack }: Props) {
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<DashboardListPeriod>('today');
  const isMobile = width < 600;
  const isCompactHeader = width < 980;

  const visibleItems = useMemo(
    () => list.items.filter((item) => periodWeight[item.period] <= periodWeight[period]),
    [list.items, period],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stickyHeader}>
          <View style={[styles.hero, { backgroundColor: list.cardBackgroundColor, borderColor: `${list.accentColor}2E` }]}>
            <View style={[styles.heroCircleLarge, { backgroundColor: `${list.accentColor}0D` }]} />
            <View style={[styles.heroCircleSmall, { backgroundColor: `${list.accentColor}14` }]} />

            <View style={[styles.pageHeader, isCompactHeader && styles.compactPageHeader]}>
              <View style={styles.headerIdentity}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={onBack} style={styles.backButton}>
                  <Icon source="arrow-left" size={20} color={theme.colors.text} />
                </Pressable>
                <View style={[styles.pageIcon, { backgroundColor: `${list.accentColor}18` }]}>
                  <Icon source={list.icon} size={22} color={list.accentColor} />
                </View>
                <View style={styles.headingCopy}>
                  <View style={styles.eyebrowRow}>
                    <View style={[styles.eyebrowDot, { backgroundColor: list.accentColor }]} />
                    <Text style={[styles.eyebrowText, { color: list.accentColor }]}>PERSONAL ACTIVITY</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.title}>{list.title}</Text>
                  <Text numberOfLines={1} style={styles.subtitle}>Records added by {userName}</Text>
                </View>
              </View>

              <View style={[styles.periodSelector, isCompactHeader && styles.compactPeriodSelector, isMobile && styles.mobilePeriodSelector]}>
                {periods.map((option) => {
                  const isActive = option.key === period;
                  return (
                    <Pressable
                      key={option.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => setPeriod(option.key)}
                      style={[
                        styles.periodButton,
                        isMobile && styles.mobilePeriodButton,
                        {
                          backgroundColor: isActive ? option.color : `${option.color}0D`,
                          borderColor: isActive ? option.color : `${option.color}24`,
                        },
                      ]}
                    >
                      <View style={[styles.periodDot, { backgroundColor: isActive ? '#FFFFFF' : option.color }]} />
                      <Text style={[styles.periodText, { color: isActive ? '#FFFFFF' : option.color }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.listPanel, { borderColor: `${list.accentColor}30` }]}>
        <View style={[styles.listAccentBand, { backgroundColor: list.accentColor }]} />
        <View style={[styles.listHeader, { backgroundColor: `${list.accentColor}0D` }]}>
          <View style={styles.listHeadingGroup}>
            <View style={[styles.headingMarker, { backgroundColor: list.accentColor }]} />
            <Text style={styles.listHeading}>{list.metricLabel}</Text>
          </View>
          <View style={[styles.recordCountBadge, { backgroundColor: `${list.accentColor}14` }]}>
            <Text style={[styles.listPeriod, { color: list.accentColor }]}>{visibleItems.length} records</Text>
          </View>
        </View>

        <View style={styles.rows}>
          {visibleItems.length ? (
            visibleItems.map((item, index) => {
              const rowColor = rowColors[index % rowColors.length];

              return (
              <View
                key={item.id}
                style={[
                  styles.row,
                  isMobile && styles.mobileRow,
                  { backgroundColor: rowColor.background, borderColor: rowColor.border },
                ]}
              >
                <View style={[styles.recordNumber, { backgroundColor: rowColor.soft }]}>
                  <Text style={[styles.recordNumberText, { color: rowColor.accent }]}>{index + 1}</Text>
                </View>
                <View style={[styles.recordCopy, isMobile && styles.mobileRecordCopy]}>
                  <Text style={styles.primaryText}>{item.primaryText}</Text>
                  <Text style={styles.secondaryText}>{item.secondaryText}</Text>
                </View>
                <View style={[styles.dateBadge, isMobile && styles.mobileDateBadge, { backgroundColor: rowColor.soft }]}>
                  <Icon source="clock-outline" size={14} color={rowColor.accent} />
                  <Text style={[styles.dateText, { color: rowColor.accent }]}>{item.dateLabel}</Text>
                </View>
              </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Icon source="clipboard-text-outline" size={30} color={theme.colors.subtle} />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyDescription}>No activity was recorded for this period.</Text>
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderRadius: theme.radius.lg,
    backgroundColor: '#F7F9FD',
  },
  scrollContent: {
    gap: theme.spacing.lg,
    padding: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  stickyHeader: {
    paddingBottom: theme.spacing.sm,
    backgroundColor: '#F7F9FD',
    zIndex: 10,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    ...theme.shadow.card,
  },
  heroCircleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -52,
    top: -96,
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    right: 132,
    bottom: -34,
  },
  pageHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    zIndex: 1,
  },
  compactPageHeader: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.md },
  headerIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
  },
  pageIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { minWidth: 0, flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrowDot: { width: 5, height: 5, borderRadius: 3 },
  eyebrowText: { fontSize: 8, lineHeight: 11, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: theme.colors.text, fontSize: 20, lineHeight: 26, fontWeight: '900' },
  subtitle: { color: theme.colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  periodSelector: {
    flexShrink: 0, marginLeft: 'auto', flexDirection: 'row', padding: 4, gap: 4, borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)',
    zIndex: 1,
  },
  compactPeriodSelector: { marginLeft: 0, alignSelf: 'flex-end' },
  mobilePeriodSelector: { width: '100%', marginLeft: 0 },
  periodButton: {
    minWidth: 82, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: 'transparent', borderRadius: theme.radius.sm,
  },
  mobilePeriodButton: { minWidth: 0, flex: 1, paddingHorizontal: theme.spacing.xs },
  periodDot: { width: 6, height: 6, borderRadius: 3 },
  periodText: { color: theme.colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  listPanel: {
    position: 'relative',
    overflow: 'hidden', borderWidth: 1, borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface, ...theme.shadow.card,
  },
  listAccentBand: { height: 4, width: '100%' },
  listHeader: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  listHeadingGroup: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  headingMarker: { width: 4, height: 20, borderRadius: 2 },
  listHeading: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  recordCountBadge: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: 999 },
  listPeriod: { color: theme.colors.muted, fontSize: 10, fontWeight: '800' },
  rows: { gap: theme.spacing.sm, padding: theme.spacing.md, backgroundColor: '#FBFCFE' },
  row: {
    minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderWidth: 1, borderRadius: theme.radius.md,
  },
  mobileRow: {
    minHeight: 88,
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  recordNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  recordNumberText: { fontSize: 11, fontWeight: '900' },
  recordCopy: { minWidth: 0, flex: 1 },
  mobileRecordCopy: { minWidth: 150 },
  primaryText: { color: theme.colors.text, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  secondaryText: { color: theme.colors.muted, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  dateBadge: {
    maxWidth: 160, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 6, borderRadius: theme.radius.sm,
  },
  mobileDateBadge: {
    maxWidth: '80%',
    marginLeft: 46,
  },
  dateText: { flexShrink: 1, color: theme.colors.muted, fontSize: 9, lineHeight: 12, fontWeight: '700' },
  emptyState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs },
  emptyTitle: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  emptyDescription: { color: theme.colors.muted, fontSize: 10, fontWeight: '600' },
});
