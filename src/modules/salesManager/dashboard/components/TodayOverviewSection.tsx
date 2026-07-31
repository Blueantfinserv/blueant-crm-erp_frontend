import { memo, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../../../../theme/theme';
import { TodayOverviewCard as TodayOverviewCardData } from '../types/dashboard';
import { RankingCircle, TodayOverviewCard } from './TodayOverviewCard';

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
  const isMobile = width < 768;
  const scoreCard = cards.find((card) => card.scoreDetails);
  const standardCards = cards.filter((card) => !card.scoreDetails);

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Today&apos;s Overview</Text>
      </View>

      {isMobile ? (
        <View style={styles.mobileOverview}>
          <View style={styles.mobileCardsGrid}>
            {standardCards.map((card, index) => (
              <TodayOverviewCard
                key={card.id}
                card={card}
                columns={2}
                notchPosition={(
                  ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
                )[index]}
              />
            ))}
            {scoreCard?.scoreDetails ? (
              <View pointerEvents="none" style={styles.mobileRankOverlay}>
                <RankingCircle rank={scoreCard.scoreDetails.rank} compact />
              </View>
            ) : null}
          </View>
          {scoreCard ? (
            <View style={styles.mobileScoreRow}>
              <TodayOverviewCard card={scoreCard} columns={2} showRankCircle={false} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.grid}>
          {cards.map((card) => (
            <TodayOverviewCard key={card.id} card={card} columns={columns} />
          ))}
        </View>
      )}
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
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mobileOverview: {
    width: '100%',
    gap: 12,
  },
  mobileCardsGrid: {
    position: 'relative',
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 0,
  },
  mobileRankOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 20,
    transform: [{ translateX: -44 }, { translateY: -44 }],
  },
  mobileScoreRow: {
    width: '100%',
    flexDirection: 'row',
  },
});
