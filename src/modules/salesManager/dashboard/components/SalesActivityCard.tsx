import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { SalesActivityCard as SalesActivityCardData } from '../types/dashboard';

type Props = {
  card: SalesActivityCardData;
  layout: 'mobile' | 'tablet' | 'desktop';
  onActionPress?: (actionId: string) => void;
};

const regularBasis: Record<Props['layout'], `${number}%`> = {
  mobile: '45%',
  tablet: '31%',
  desktop: '19%',
};

const featuredBasis: Record<Props['layout'], `${number}%`> = {
  mobile: '100%',
  tablet: '100%',
  desktop: '37%',
};

export const SalesActivityCard = memo(function SalesActivityCard({ card, layout, onActionPress }: Props) {
  const accentColor = card.accentColor;
  const isFeatured = card.type === 'quick-actions';

  return (
    <View
      style={[
        styles.card,
        {
          flexBasis: isFeatured ? featuredBasis[layout] : regularBasis[layout],
          backgroundColor: card.cardBackgroundColor,
          borderColor: `${accentColor}24`,
        },
      ]}
    >
      <View style={[styles.decorativeCircle, { backgroundColor: `${accentColor}0D` }]} />
      <View style={styles.header}>
        <Text style={styles.title}>{card.title}</Text>
        {card.type !== 'quick-actions' ? (
          <View style={[styles.headerIcon, { backgroundColor: `${accentColor}12` }]}>
            <Icon source={card.icon} size={18} color={accentColor} />
          </View>
        ) : null}
      </View>

      {card.type === 'summary' ? (
        <View style={styles.metrics}>
          {card.values.map((metric) => (
            <View key={metric.label} style={styles.metric}>
              <Text numberOfLines={1} style={styles.metricLabel}>
                {metric.label}
              </Text>
              <Text style={[styles.metricValue, { color: accentColor }]}>{metric.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {card.type === 'quick-actions' ? (
        <View style={styles.actionsGrid}>
          {card.actions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityLabel={action.label || 'Future action'}
              disabled={action.disabled}
              onPress={() => onActionPress?.(action.id)}
              style={({ pressed }) => [
                styles.action,
                action.disabled && styles.futureAction,
                pressed && !action.disabled && styles.actionPressed,
              ]}
            >
              {action.icon ? <Icon source={action.icon} size={20} color={accentColor} /> : null}
              {action.label ? <Text style={styles.actionLabel}>{action.label}</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    minWidth: 0,
    minHeight: 101,
    flexGrow: 1,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    right: -48,
    bottom: -62,
  },
  header: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    zIndex: 1,
  },
  title: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  metric: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.20)',
  },
  metricValue: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  metricLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  actionsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    zIndex: 1,
  },
  action: {
    minWidth: 110,
    flexBasis: '46%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  futureAction: {
    minHeight: 30,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
});
