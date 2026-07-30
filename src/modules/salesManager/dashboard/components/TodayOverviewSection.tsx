import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../../../../theme/theme';
import { TodayOverviewCard as TodayOverviewCardData } from '../types/dashboard';
import { TodayOverviewCard } from './TodayOverviewCard';

type Props = {
  cards: readonly TodayOverviewCardData[];
};

export const TodayOverviewSection = memo(function TodayOverviewSection({ cards }: Props) {
  const { width } = useWindowDimensions();
  const columns = useMemo<2 | 3 | 6>(() => {
    if (width >= 1200) return 6;
    if (width >= 768) return 3;
    return 2;
  }, [width]);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Today&apos;s Overview</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <TodayOverviewCard key={card.id} card={card} columns={columns} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: theme.spacing.sm,
  },
  heading: {
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: theme.spacing.md,
  },
});
