import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { ReportFiltersSection } from './components/ReportFiltersSection';
import { ReportSidebarFilters } from './components/ReportSidebarFilters';
import {
  createDefaultPeriods,
  createDefaultRanges,
  DropdownKey,
  periodCards,
  periodOptions,
  PeriodKey,
  reportTypeOptions,
  smNameOptions,
  teamOptions,
} from './constants/reportFilterOptions';
import { useDropdown } from './hooks/useDropdown';
import { formatReportRange, useReportDatePicker } from './hooks/useReportDatePicker';
import { ReportPreview } from './reportPreview/ReportPreview';
import { DateRange, ReportPreviewData } from './reportPreview/types';
import { resolveReportPreviewData } from './reportPreview/reportPreviewResolver';

export function ReportsScreen({
  onFilterChange,
  onSmNameChange,
  onReportTypeChange,
}: {
  onFilterChange?: (key: PeriodKey, period: string, range?: DateRange) => void;
  onSmNameChange?: (value: string) => void;
  onReportTypeChange?: (value: string) => void;
} = {}) {
  const [periods, setPeriods] = useState<Record<PeriodKey, string>>(() => createDefaultPeriods());
  const [ranges, setRanges] = useState<Record<PeriodKey, DateRange>>(() => createDefaultRanges());
  const [previewReport, setPreviewReport] = useState<ReportPreviewData | null>(null);

  const [smName, setSmName] = useState<string | null>(null);
  const [reportType, setReportType] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);

  const { activeDropdown, dropdownAnchor, registerAnchorRef, open, close } = useDropdown<DropdownKey>();
  const { openCustomRangePicker } = useReportDatePicker();

  const handlePeriodPress = useCallback(
    (key: PeriodKey) => {
      open(key);
    },
    [open]
  );

  const handlePeriodSelect = useCallback(
    (key: PeriodKey, value: string) => {
      const isCustomRange = value.trim().toLowerCase().includes('custom');

      if (isCustomRange) {
        close();
        openCustomRangePicker(ranges[key], (range) => {
          setRanges((prev) => ({ ...prev, [key]: range }));
          setPeriods((prev) => ({ ...prev, [key]: value }));
          onFilterChange?.(key, value, range);
        });
        return;
      }

      setPeriods((prev) => ({ ...prev, [key]: value }));
      close();
      onFilterChange?.(key, value);
    },
    [close, onFilterChange, openCustomRangePicker, ranges]
  );

  const handleSmNamePress = useCallback(() => {
    open('smName');
  }, [open]);

  const handleReportTypePress = useCallback(() => {
    open('reportType');
  }, [open]);

  const handleTeamPress = useCallback(() => {
    open('team');
  }, [open]);

  const handleDropdownSelect = useCallback(
    (key: DropdownKey, value: string) => {
      if (key === 'smName') {
        setSmName(value);
        close();
        onSmNameChange?.(value);
        return;
      }

      if (key === 'reportType') {
        setReportType(value);
        close();
        onReportTypeChange?.(value);
        return;
      }

      if (key === 'team') {
        setTeam(value);
        close();
        return;
      }

      handlePeriodSelect(key, value);
    },
    [close, handlePeriodSelect, onReportTypeChange, onSmNameChange]
  );

  const periodLabels = useMemo(
    () =>
      periodCards.reduce<Record<PeriodKey, string>>((accumulator, cardConfig) => {
        const value = periods[cardConfig.key];
        accumulator[cardConfig.key] = value.trim().toLowerCase().includes('custom')
          ? formatReportRange(ranges[cardConfig.key].from, ranges[cardConfig.key].to)
          : value;
        return accumulator;
      }, {} as Record<PeriodKey, string>),
    [periods, ranges]
  );

  const getDropdownOptions = (key: DropdownKey): string[] => {
    if (key === 'smName') return smNameOptions;
    if (key === 'reportType') return reportTypeOptions;
    if (key === 'team') return teamOptions;
    return periodOptions;
  };

  const getDropdownSelected = (key: DropdownKey): string | null => {
    if (key === 'smName') return smName;
    if (key === 'reportType') return reportType;
    if (key === 'team') return team;
    return periods[key];
  };

  const handleGenerateReport = useCallback(() => {
    const report = resolveReportPreviewData(periods.points, ranges.points);
    setPreviewReport(report);
  }, [periods.points, ranges.points]);

  const handleClearFilters = useCallback(() => {
    setPeriods(createDefaultPeriods());
    setRanges(createDefaultRanges());
    setSmName(null);
    setReportType(null);
    setTeam(null);
    setPreviewReport(null);
    close();
  }, [close]);

  return (
    <View style={styles.screen}>
      <ReportFiltersSection
        periodCards={periodCards}
        periodLabels={periodLabels}
        registerAnchorRef={registerAnchorRef}
        onPeriodPress={handlePeriodPress}
        onGenerateReport={handleGenerateReport}
        onClearFilters={handleClearFilters}
      />

      <View style={styles.previewRow}>
        <View style={styles.previewCard}>
          <View style={[styles.accentBar, styles.accentBarBlue]} />
          <View style={styles.previewHeader}>
            <View style={[styles.previewBadge, styles.previewBadgeBlue]}>
              <Text style={styles.previewBadgeText}>Report Preview</Text>
            </View>
          </View>

          <ScrollView
            style={styles.previewBody}
            contentContainerStyle={styles.previewBodyContent}
            showsVerticalScrollIndicator
          >
            <ReportPreview report={previewReport} />
          </ScrollView>
        </View>

        <ReportSidebarFilters
          smName={smName}
          reportType={reportType}
          team={team}
          registerAnchorRef={registerAnchorRef}
          onSmNamePress={handleSmNamePress}
          onReportTypePress={handleReportTypePress}
          onTeamPress={handleTeamPress}
        />
      </View>

      <Modal visible={activeDropdown !== null} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.dropdownOverlay} onPress={close}>
          {dropdownAnchor && activeDropdown ? (
            <View
              style={[
                styles.dropdownAnchor,
                {
                  top: dropdownAnchor.top,
                  left: dropdownAnchor.left,
                  width: dropdownAnchor.width,
                },
              ]}
            >
              <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
                {getDropdownOptions(activeDropdown).map((option) => {
                  const selected = option === getDropdownSelected(activeDropdown);
                  return (
                    <Pressable
                      key={option}
                      style={[styles.dropdownItem, selected && styles.dropdownItemActive]}
                      onPress={() => handleDropdownSelect(activeDropdown, option)}
                    >
                      <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    gap: 8,
  },
  previewRow: {
    position: 'relative',
    width: '100%',
  },
  previewCard: {
    width: '81.5%',
    height: 450,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 10,
    gap: 8,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  accentBar: {
    height: 3,
    borderRadius: 0,
    marginHorizontal: -10,
    marginTop: 0,
    marginBottom: 3,
  },
  accentBarBlue: {
    backgroundColor: 'rgba(96, 165, 250, 0.95)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  previewBadgeBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  previewBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  previewBody: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 250, 252, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.10)',
  },
  previewBodyContent: {
    flexGrow: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownAnchor: {
    position: 'absolute',
    maxHeight: 260,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    ...theme.shadow.card,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 260,
  },
  dropdownItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
} as const);
