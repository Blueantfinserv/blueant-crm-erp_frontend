import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../../../../theme/theme';
import { SalesActivityCard as SalesActivityCardData } from '../types/dashboard';
import { SalesActivityCard } from './SalesActivityCard';

type Props = {
  cards: readonly SalesActivityCardData[];
  onActionPress?: (actionId: string) => void;
};

export const SalesActivitySection = memo(function SalesActivitySection({ cards, onActionPress }: Props) {
  const { width } = useWindowDimensions();
  const layout = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width >= 1200) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'mobile';
  }, [width]);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Sales Activity</Text>
      </View>
      <View style={styles.grid}>
        {cards.map((card) => (
          <SalesActivityCard key={card.id} card={card} layout={layout} onActionPress={onActionPress} />
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
