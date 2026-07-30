import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme/theme';
import { DropdownKey } from '../constants/reportFilterOptions';

export function ReportSidebarFilters({
  smName,
  reportType,
  team,
  registerAnchorRef,
  onSmNamePress,
  onReportTypePress,
  onTeamPress,
}: {
  smName: string | null;
  reportType: string | null;
  team: string | null;
  registerAnchorRef: (key: DropdownKey) => (node: View | null) => void;
  onSmNamePress: () => void;
  onReportTypePress: () => void;
  onTeamPress: () => void;
}) {
  return (
    <View style={styles.previewSidePanel}>
      <View
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(255, 232, 214, 0.96)', borderColor: 'rgba(251, 146, 96, 0.24)' },
        ]}
      >
        <Text style={styles.previewSideLabel}>From Date</Text>
      </View>

      <View
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(226, 239, 255, 0.96)', borderColor: 'rgba(96, 165, 250, 0.24)' },
        ]}
      >
        <Text style={styles.previewSideLabel}>To Date</Text>
      </View>

      <Pressable
        ref={registerAnchorRef('smName')}
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(229, 251, 237, 0.96)', borderColor: 'rgba(74, 222, 128, 0.24)' },
        ]}
        onPress={onSmNamePress}
      >
        <View style={styles.previewSideRow}>
          <Text style={styles.previewSideLabel}>{smName ?? 'SM Name'}</Text>
          <Text style={styles.previewSideChevron}>▼</Text>
        </View>
      </Pressable>

      <Pressable
        ref={registerAnchorRef('reportType')}
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(242, 232, 255, 0.96)', borderColor: 'rgba(168, 85, 247, 0.22)' },
        ]}
        onPress={onReportTypePress}
      >
        <View style={styles.previewSideRow}>
          <Text style={styles.previewSideLabel}>{reportType ?? 'Report Type'}</Text>
          <Text style={styles.previewSideChevron}>▼</Text>
        </View>
      </Pressable>

      <Pressable
        ref={registerAnchorRef('team')}
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(242, 232, 255, 0.96)', borderColor: 'rgba(168, 85, 247, 0.22)' },
        ]}
        onPress={onTeamPress}
      >
        <View style={styles.previewSideRow}>
          <Text style={styles.previewSideLabel}>{team ?? 'Team'}</Text>
          <Text style={styles.previewSideChevron}>▼</Text>
        </View>
      </Pressable>

      <View
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(236, 253, 245, 0.96)', borderColor: 'rgba(16, 185, 129, 0.20)' },
        ]}
      />

      <View
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(239, 246, 255, 0.96)', borderColor: 'rgba(59, 130, 246, 0.20)' },
        ]}
      />

      <View
        style={[
          styles.previewSideBox,
          { backgroundColor: 'rgba(248, 250, 252, 0.96)', borderColor: 'rgba(148, 163, 184, 0.18)' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  previewSidePanel: {
    position: 'absolute',
    right: 4,
    width: 185,
    height: 450,
    gap: 8,
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.10)',
    ...theme.shadow.card,
  },
  previewSideBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  previewSideLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  previewSideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  previewSideChevron: {
    color: theme.colors.subtle,
    fontSize: 9,
  },
} as const);
