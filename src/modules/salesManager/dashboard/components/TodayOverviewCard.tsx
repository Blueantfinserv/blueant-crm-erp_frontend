import { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { Path, Svg } from 'react-native-svg';
import { theme } from '../../../../theme/theme';
import { TodayOverviewCard as TodayOverviewCardData } from '../types/dashboard';

type Props = {
  card: TodayOverviewCardData;
  columns: 2 | 3 | 6;
  showRankCircle?: boolean;
  notchPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
};

const columnBasis: Record<Props['columns'], `${number}%`> = {
  2: '45%',
  3: '31%',
  6: '15%',
};

const featuredColumnBasis: Record<Props['columns'], `${number}%`> = {
  2: '100%',
  3: '65%',
  6: '25%',
};

export const TodayOverviewCard = memo(function TodayOverviewCard({
  card,
  columns,
  showRankCircle = true,
  notchPosition,
}: Props) {
  const { width } = useWindowDimensions();
  const flexBasis = columns === 6
    ? card.featured
      ? width * 0.25 + 60
      : width * 0.15 - 15
    : card.featured
      ? featuredColumnBasis[columns]
      : columnBasis[columns];
  const scorePoints = card.scoreDetails?.points;
  const previousWeekPoints = card.scoreDetails?.previousWeekPoints;
  const pointsChange = scorePoints != null && previousWeekPoints != null
    ? scorePoints - previousWeekPoints
    : null;
  const pointsChangeLabel = pointsChange === null ? '-' : `${pointsChange >= 0 ? '+' : ''}${pointsChange} pts`;

  if (card.scoreDetails) {
    return (
      <View style={[styles.scoreGroup, !showRankCircle && styles.scoreGroupWithoutRank, { flexBasis }]}>
        <View
          accessible
          accessibilityLabel={`${card.title}: ${card.scoreDetails.points} points, rank ${card.scoreDetails.rank}`}
          style={[
            styles.scoreCard,
            {
              backgroundColor: card.cardBackgroundColor,
              borderColor: `${card.accentColor}24`,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: card.iconBackgroundColor }]}>
            <Icon source={card.icon} size={18} color={card.accentColor} />
          </View>
          <View style={styles.scorePrimary}>
            <Text numberOfLines={1} style={styles.scoreTitle}>{card.title}</Text>
            <Text numberOfLines={1} style={[styles.scoreValue, { color: card.accentColor }]}>
              {card.scoreDetails.points === null ? '-' : `${card.scoreDetails.points} Points`}
            </Text>
          </View>
          <View style={[styles.changeBadge, (pointsChange ?? 0) >= 0 ? styles.positiveBadge : styles.negativeBadge]}>
            <Icon
              source={(pointsChange ?? 0) >= 0 ? 'trending-up' : 'trending-down'}
              size={13}
              color={(pointsChange ?? 0) >= 0 ? '#15803D' : '#DC2626'}
            />
            <View>
              <Text style={styles.badgeLabel}>Last Week</Text>
              <Text style={[styles.changeValue, (pointsChange ?? 0) >= 0 ? styles.positiveChange : styles.negativeChange]}>
                {pointsChangeLabel}
              </Text>
            </View>
          </View>
        </View>

        {showRankCircle ? <RankingCircle rank={card.scoreDetails.rank} /> : null}
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`${card.title}: ${card.value}`}
      style={[
        styles.card,
        card.featured && styles.featuredCard,
        notchPosition && styles.notchedCard,
        (notchPosition === 'top-left' || notchPosition === 'bottom-left') && styles.leftNotchedCard,
        (notchPosition === 'top-right' || notchPosition === 'bottom-right') && styles.rightNotchedCard,
        {
          flexBasis,
          backgroundColor: notchPosition ? 'transparent' : card.cardBackgroundColor,
          borderColor: notchPosition ? 'transparent' : `${card.accentColor}24`,
        },
      ]}
    >
      {notchPosition ? (
        <NotchedCardBackground
          position={notchPosition}
          fill={card.cardBackgroundColor}
          stroke={`${card.accentColor}30`}
        />
      ) : (
        <>
          <View
            pointerEvents="none"
            style={[styles.decorativeCircleLarge, { backgroundColor: `${card.accentColor}0D` }]}
          />
          <View
            pointerEvents="none"
            style={[styles.decorativeCircleSmall, { backgroundColor: `${card.accentColor}14` }]}
          />
        </>
      )}

      <View
        style={[
          styles.iconContainer,
          notchPosition && styles.notchedIconContainer,
          { backgroundColor: card.iconBackgroundColor },
        ]}
      >
        <Icon source={card.icon} size={notchPosition ? 15 : 18} color={card.accentColor} />
      </View>

      {
        <View style={[styles.content, card.featured && styles.featuredContent]}>
          <Text
            numberOfLines={card.featured ? 1 : 2}
            style={[styles.title, card.featured && styles.featuredTitle, notchPosition && styles.notchedTitle]}
          >
            {card.title}
          </Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[styles.value, notchPosition && styles.notchedValue, { color: card.accentColor }]}
          >
            {card.value}
          </Text>
          {card.subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {card.subtitle}
            </Text>
          ) : null}
        </View>
      }
    </View>
  );
});

function NotchedCardBackground({
  position,
  fill,
  stroke,
}: {
  position: NonNullable<Props['notchPosition']>;
  fill: string;
  stroke: string;
}) {
  const paths: Record<NonNullable<Props['notchPosition']>, string> = {
    'top-left': 'M14 1 H146 Q159 1 159 14 V27 A45 45 0 0 0 114 71 H14 Q1 71 1 58 V14 Q1 1 14 1 Z',
    'top-right': 'M14 1 H146 Q159 1 159 14 V58 Q159 71 146 71 H46 A45 45 0 0 0 1 27 V14 Q1 1 14 1 Z',
    'bottom-left': 'M14 1 H114 A45 45 0 0 0 159 46 V58 Q159 71 146 71 H14 Q1 71 1 58 V14 Q1 1 14 1 Z',
    'bottom-right': 'M46 1 H146 Q159 1 159 14 V58 Q159 71 146 71 H14 Q1 71 1 58 V46 A45 45 0 0 0 46 1 Z',
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 160 72" preserveAspectRatio="none">
        <Path d={paths[position]} fill={fill} stroke={stroke} strokeWidth="1.3" />
      </Svg>
    </View>
  );
}

export function RankingCircle({ rank, compact = false }: { rank: number | null; compact?: boolean }) {
  return (
    <View style={[styles.rankCircle, compact && styles.rankCircleCompact]}>
      <View pointerEvents="none" style={[styles.rankCircleGlow, compact && styles.rankCircleGlowCompact]} />
      <Icon source="trophy-outline" size={compact ? 20 : 24} color="#FFFFFF" />
      <Text style={[styles.rankCircleLabel, compact && styles.rankCircleLabelCompact]}>RANK</Text>
      <Text style={[styles.rankCircleValue, compact && styles.rankCircleValueCompact]}>{rank === null ? '-' : `#${rank}`}</Text>
    </View>
  );
}

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
  scoreGroup: {
    minWidth: 0,
    minHeight: 108,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreGroupWithoutRank: {
    minHeight: 64,
  },
  scoreCard: {
    minWidth: 0,
    minHeight: 64,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
  },
  rankCircle: {
    position: 'relative',
    width: 108,
    height: 108,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#BBF7D0',
    borderRadius: 54,
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  rankCircleGlow: {
    position: 'absolute',
    width: 78,
    height: 78,
    right: -27,
    top: -25,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  rankCircleLabel: {
    marginTop: 2,
    color: '#D1FAE5',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rankCircleValue: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '900',
  },
  rankCircleCompact: {
    width: 88,
    height: 88,
    borderWidth: 4,
    borderRadius: 44,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
  },
  rankCircleGlowCompact: {
    width: 64,
    height: 64,
    right: -22,
    top: -21,
    borderRadius: 32,
  },
  rankCircleLabelCompact: {
    marginTop: 1,
    fontSize: 7,
    lineHeight: 8,
  },
  rankCircleValueCompact: {
    fontSize: 19,
    lineHeight: 21,
  },
  featuredCard: {
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: theme.spacing.md,
  },
  notchedCard: {
    minHeight: 72,
    borderWidth: 0,
    borderRadius: 0,
    shadowOpacity: 0.08,
  },
  leftNotchedCard: {
    paddingRight: 48,
  },
  rightNotchedCard: {
    paddingLeft: 48,
  },
  notchedIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  notchedTitle: {
    fontSize: 10,
    lineHeight: 12,
  },
  notchedValue: {
    fontSize: 18,
    lineHeight: 21,
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
  badgeLabel: {
    color: theme.colors.muted,
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
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
