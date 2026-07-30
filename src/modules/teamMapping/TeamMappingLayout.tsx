import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { theme } from '../../theme/theme';

export function TeamMappingLayout({ children }: PropsWithChildren) {
  return <View style={styles.container}>{children}</View>;
}

export function TeamMappingHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerTextBlock}>
        <Text style={styles.title}>Team Mapping</Text>
        <Text style={styles.subtitle}>View leadership structure and assigned team relationships.</Text>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.searchBox}>
          <TextInput placeholder="Search" placeholderTextColor={theme.colors.subtle} style={styles.searchInput} />
        </View>
        <Pressable style={styles.filterPill}>
          <Text style={styles.filterText}>Branch Filter</Text>
        </Pressable>
        <AuthButton title="Assign Team" onPress={() => {}} />
      </View>
    </View>
  );
}

export function TeamMappingColumn({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>{title}</Text>
      <View style={styles.columnBody}>{children}</View>
    </View>
  );
}

export function TeamMappingCard({
  title,
  selected,
  children,
  onPress,
}: PropsWithChildren<{ title: string; selected?: boolean; onPress?: () => void }>) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardContent}>{children}</View>
    </Pressable>
  );
}

export function TeamMappingBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' }) {
  return (
    <View style={[styles.badge, tone === 'success' && styles.badgeSuccess, tone === 'warning' && styles.badgeWarning]}>
      <Text style={[styles.badgeText, tone === 'success' && styles.badgeTextSuccess, tone === 'warning' && styles.badgeTextWarning]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    width: '100%',
  },
  header: {
    gap: 16,
  },
  headerTextBlock: {
    gap: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    minWidth: 180,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...theme.shadow.card,
  },
  searchInput: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  filterPill: {
    minWidth: 140,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  filterText: {
    color: theme.colors.subtle,
    fontSize: 14,
    fontWeight: '600',
  },
  column: {
    flex: 1,
    minWidth: 280,
    gap: 12,
  },
  columnTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  columnBody: {
    gap: 12,
  },
  card: {
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    padding: 16,
    gap: 12,
    ...theme.shadow.card,
  },
  cardSelected: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardContent: {
    gap: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  badgeText: {
    color: theme.colors.subtle,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#059669',
  },
  badgeTextWarning: {
    color: '#B45309',
  },
});

