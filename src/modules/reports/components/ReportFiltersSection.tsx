import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme/theme';
import {
  DropdownKey,
  PeriodCardConfig,
  PeriodKey,
  ToneKey,
} from '../constants/reportFilterOptions';

function FilterDropdownCard({
  title,
  icon,
  tone,
  value,
  onPress,
  boxRef,
}: {
  title: string;
  icon: string;
  tone: ToneKey;
  value: string;
  onPress: () => void;
  boxRef: (node: View | null) => void;
}) {
  return (
    <View style={[styles.card, toneStyles[tone].card]}>
      <View style={[styles.accentBar, toneStyles[tone].accentBar]} />
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, toneStyles[tone].iconWrap]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      <Pressable ref={boxRef} style={styles.filterDropdownBox} onPress={onPress}>
        <Text style={styles.filterDropdownText} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.previewSideChevron}>▼</Text>
      </Pressable>
    </View>
  );
}

export function ReportFiltersSection({
  periodCards,
  periodLabels,
  registerAnchorRef,
  onPeriodPress,
  onGenerateReport,
  onClearFilters,
}: {
  periodCards: PeriodCardConfig[];
  periodLabels: Record<PeriodKey, string>;
  registerAnchorRef: (key: DropdownKey) => (node: View | null) => void;
  onPeriodPress: (key: PeriodKey) => void;
  onGenerateReport: () => void;
  onClearFilters: () => void;
}) {
  return (
    <View style={styles.section}>
      {periodCards.map((cardConfig) => (
        <FilterDropdownCard
          key={cardConfig.key}
          title={cardConfig.title}
          icon={cardConfig.icon}
          tone={cardConfig.tone}
          value={periodLabels[cardConfig.key]}
          boxRef={registerAnchorRef(cardConfig.key)}
          onPress={() => onPeriodPress(cardConfig.key)}
        />
      ))}

      <View style={styles.actionColumn}>
        <Pressable style={[styles.actionButton, styles.actionButtonPrimary]} onPress={onGenerateReport}>
          <Text style={styles.actionButtonTextPrimary}>Generate Report</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionButtonSecondary]} onPress={onClearFilters}>
          <Text style={styles.actionButtonTextSecondary}>Clear Filter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    alignItems: 'stretch',
    width: '100%',
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingTop: 0,
    paddingBottom: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
    ...theme.shadow.card,
    overflow: 'hidden',
  },
  tonePeachCard: {
    backgroundColor: 'rgba(255, 249, 245, 0.98)',
    borderColor: 'rgba(251, 146, 96, 0.24)',
  },
  toneBlueCard: {
    backgroundColor: 'rgba(245, 249, 255, 0.98)',
    borderColor: 'rgba(96, 165, 250, 0.24)',
  },
  toneGreenCard: {
    backgroundColor: 'rgba(243, 251, 247, 0.98)',
    borderColor: 'rgba(74, 222, 128, 0.24)',
  },
  tonePinkCard: {
    backgroundColor: 'rgba(255, 245, 249, 0.98)',
    borderColor: 'rgba(236, 72, 153, 0.20)',
  },
  toneMintCard: {
    backgroundColor: 'rgba(243, 253, 248, 0.98)',
    borderColor: 'rgba(16, 185, 129, 0.20)',
  },
  toneSkyCard: {
    backgroundColor: 'rgba(245, 249, 255, 0.98)',
    borderColor: 'rgba(59, 130, 246, 0.20)',
  },
  accentBar: {
    height: 3,
    borderRadius: 0,
    marginHorizontal: -6,
    marginTop: 0,
    marginBottom: 3,
  },
  accentBarPeach: {
    backgroundColor: 'rgba(251, 146, 96, 0.95)',
  },
  accentBarBlue: {
    backgroundColor: 'rgba(96, 165, 250, 0.95)',
  },
  accentBarGreen: {
    backgroundColor: 'rgba(74, 222, 128, 0.95)',
  },
  accentBarPink: {
    backgroundColor: 'rgba(236, 72, 153, 0.95)',
  },
  accentBarMint: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  accentBarSky: {
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
  },
  actionColumn: {
    flex: 1,
    minWidth: 0,
    maxWidth: 160,
    justifyContent: 'center',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    minHeight: 26,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: 'rgba(15, 23, 42, 0.30)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 8,
    overflow: 'hidden',
  },
  actionButtonPrimary: {
    backgroundColor: 'rgba(37, 99, 235, 0.92)',
    borderColor: 'rgba(30, 64, 175, 1)',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    borderColor: 'rgba(185, 28, 28, 1)',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  actionButtonTextSecondary: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  iconWrapPeach: {
    backgroundColor: 'rgba(251, 146, 96, 0.16)',
  },
  iconWrapBlue: {
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
  },
  iconWrapGreen: {
    backgroundColor: 'rgba(74, 222, 128, 0.16)',
  },
  iconWrapPink: {
    backgroundColor: 'rgba(236, 72, 153, 0.16)',
  },
  iconWrapMint: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  iconWrapSky: {
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  icon: {
    fontSize: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 0,
  },
  title: {
    color: theme.colors.text,
    fontSize: 10,
    fontWeight: '800',
  },
  filterDropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  filterDropdownText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 9,
    fontWeight: '700',
  },
  previewSideChevron: {
    color: theme.colors.subtle,
    fontSize: 9,
  },
} as const);

const toneStyles: Record<
  ToneKey,
  { card: object; iconWrap: object; accentBar: object }
> = {
  peach: {
    card: styles.tonePeachCard,
    iconWrap: styles.iconWrapPeach,
    accentBar: styles.accentBarPeach,
  },
  blue: {
    card: styles.toneBlueCard,
    iconWrap: styles.iconWrapBlue,
    accentBar: styles.accentBarBlue,
  },
  green: {
    card: styles.toneGreenCard,
    iconWrap: styles.iconWrapGreen,
    accentBar: styles.accentBarGreen,
  },
  pink: {
    card: styles.tonePinkCard,
    iconWrap: styles.iconWrapPink,
    accentBar: styles.accentBarPink,
  },
  mint: {
    card: styles.toneMintCard,
    iconWrap: styles.iconWrapMint,
    accentBar: styles.accentBarMint,
  },
  sky: {
    card: styles.toneSkyCard,
    iconWrap: styles.iconWrapSky,
    accentBar: styles.accentBarSky,
  },
};
