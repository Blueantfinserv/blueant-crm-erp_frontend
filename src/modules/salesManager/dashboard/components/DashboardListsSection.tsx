import { memo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { theme } from '../../../../theme/theme';
import { DashboardListCard } from '../types/dashboard';

type Props = {
  cards: readonly DashboardListCard[];
  onOpenList: (listId: DashboardListCard['id']) => void;
};

export const DashboardListsSection = memo(function DashboardListsSection({ cards, onOpenList }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1200;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Detailed Lists</Text>

      <View style={styles.cardsGrid}>
        {cards.map((card) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`${card.title}, ${card.items.length} records`}
              onPress={() => onOpenList(card.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  flexBasis: isDesktop ? '23%' : '45%',
                  backgroundColor: card.cardBackgroundColor,
                  borderColor: `${card.accentColor}24`,
                },
                pressed && styles.pressedCard,
              ]}
            >
              <View style={[styles.icon, { backgroundColor: `${card.accentColor}12` }]}>
                <Icon source={card.icon} size={19} color={card.accentColor} />
              </View>
              <View style={styles.cardCopy}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {card.title}
                </Text>
              </View>
              <Icon source="chevron-right" size={18} color={theme.colors.muted} />
            </Pressable>
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.1,
  },
  cardsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  card: {
    minWidth: 0,
    minHeight: 64,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
  },
  pressedCard: {
    opacity: 0.75,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
});
