import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { TodayOverviewCard as TodayOverviewCardData } from '../types/dashboard';

type Props = {
  card: TodayOverviewCardData;
  columns: 2 | 3 | 6;
};

const columnBasis: Record<Props['columns'], `${number}%`> = {
  2: '45%',
  3: '31%',
  6: '15%',
};

const featuredColumnBasis: Record<Props['columns'], `${number}%`> = {
  2: '100%',
  3: '65%',
  6: '31%',
};

export const TodayOverviewCard = memo(function TodayOverviewCard({ card, columns }: Props) {
  const flexBasis = card.featured ? featuredColumnBasis[columns] : columnBasis[columns];
  const pointsChange = card.scoreDetails
    ? card.scoreDetails.points - card.scoreDetails.previousWeekPoints
    : 0;
  const pointsChangeLabel = `${pointsChange >= 0 ? '+' : ''}${pointsChange}`;

  return (
    <View
      accessible
      accessibilityLabel={`${card.title}: ${card.value}`}
      style={[
        styles.card,
        card.featured && styles.featuredCard,
        {
          flexBasis,
          backgroundColor: card.cardBackgroundColor,
          borderColor: `${card.accentColor}24`,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.decorativeCircleLarge, { backgroundColor: `${card.accentColor}0D` }]}
      />
      <View
        pointerEvents="none"
        style={[styles.decorativeCircleSmall, { backgroundColor: `${card.accentColor}14` }]}
      />

      <View
        style={[styles.iconContainer, { backgroundColor: card.iconBackgroundColor }]}
      >
        <Icon source={card.icon} size={18} color={card.accentColor} />
      </View>

      {card.scoreDetails ? (
        <View style={styles.scoreContent}>
          <View style={styles.scorePrimary}>
            <Text numberOfLines={1} style={styles.scoreTitle}>{card.title}</Text>
            <Text numberOfLines={1} style={[styles.scoreValue, { color: card.accentColor }]}>
              {card.scoreDetails.points} Points
            </Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.badgeLabel}>Weekly Rank</Text>
            <Text style={styles.rankValue}>#{card.scoreDetails.rank}</Text>
          </View>
          <View style={[styles.changeBadge, pointsChange >= 0 ? styles.positiveBadge : styles.negativeBadge]}>
            <Icon
              source={pointsChange >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={pointsChange >= 0 ? '#15803D' : '#DC2626'}
            />
            <View>
              <Text style={styles.badgeLabel}>Last Week</Text>
              <Text style={[styles.changeValue, pointsChange >= 0 ? styles.positiveChange : styles.negativeChange]}>
                {pointsChangeLabel} pts
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.content, card.featured && styles.featuredContent]}>
          <Text
            numberOfLines={card.featured ? 1 : 2}
            style={[styles.title, card.featured && styles.featuredTitle]}
          >
            {card.title}
          </Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.value, { color: card.accentColor }]}
          >
            {card.value}
          </Text>
          {card.subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {card.subtitle}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    minWidth: 0,
    minHeight: 60,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    overflow: 'hidden',
  },
  featuredCard: {
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: theme.spacing.md,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
    zIndex: 1,
  },
  featuredContent: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  scoreContent: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    zIndex: 1,
  },
  scorePrimary: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  scoreTitle: {
    color: theme.colors.muted,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  scoreValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  rankBadge: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  badgeLabel: {
    color: theme.colors.muted,
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  rankValue: {
    color: '#047857',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  changeBadge: {
    minWidth: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  positiveBadge: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  negativeBadge: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  changeValue: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  positiveChange: {
    color: '#16A34A',
  },
  negativeChange: {
    color: '#DC2626',
  },
  title: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  featuredTitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  value: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: theme.colors.subtle,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  decorativeCircleLarge: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    right: -24,
    top: -34,
  },
  decorativeCircleSmall: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    right: 28,
    bottom: -10,
  },
});
