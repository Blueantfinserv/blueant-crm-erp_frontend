import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthButton } from '../../components/AuthButton';
import { theme } from '../../theme/theme';
import { EmptyState, LeadFilterBar, LeadStatsCard, LeadTable, LoadingSkeleton } from './LeadComponents';
import { leadRows, type LeadRow } from './leadData';

export function LeadScreen({ onOpenLeadDetails }: { onOpenLeadDetails?: (lead: LeadRow) => void }) {
  const rows = leadRows;
  const isLoading = false;
  const total = rows.length;
  const showingStart = total > 0 ? 1 : 0;
  const showingEnd = total;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Leads</Text>
            <Text style={styles.subtitle}>Manage and track all sales leads.</Text>
          </View>
          <View style={styles.headerActions}>
            <AuthButton title="Import Leads" onPress={() => {}} variant="secondary" />
            <AuthButton title="Add Lead" onPress={() => {}} />
          </View>
        </View>

        <LeadFilterBar />

        <View style={styles.statsGrid}>
          <LeadStatsCard title="Total Leads" value="384" />
          <LeadStatsCard title="New Leads" value="96" tone="warning" />
          <LeadStatsCard title="Follow-up Today" value="28" tone="success" />
          <LeadStatsCard title="Converted" value="63" />
          <LeadStatsCard title="Lost" value="21" />
        </View>

        <View style={styles.tableShell}>
          <View style={styles.tableHeader}>
            {['Lead ID', 'Customer Name', 'Company', 'Phone', 'Source', 'Assigned To', 'Lead Status', 'Priority', 'Next Follow-up', 'Created Date', 'Actions'].map((column) => (
              <Text key={column} style={styles.tableHeaderText}>
                {column}
              </Text>
            ))}
          </View>
          {isLoading ? <LoadingSkeleton /> : rows.length ? <LeadTable rows={rows} onLeadPress={onOpenLeadDetails} /> : <EmptyState title="No leads found." description="Try adjusting filters or create a new lead to get started." />}
        </View>

        <View style={styles.paginationFooter}>
          <View style={styles.paginationGroup}>
            <View style={styles.paginationPill}>
              <Text style={styles.paginationPillText}>Previous</Text>
            </View>
            <View style={[styles.paginationPill, styles.paginationPillActive]}>
              <Text style={[styles.paginationPillText, styles.paginationPillTextActive]}>1</Text>
            </View>
            <View style={styles.paginationPill}>
              <Text style={styles.paginationPillText}>Next</Text>
            </View>
          </View>
          <View style={styles.rowsPerPage}>
            <Text style={styles.paginationText}>Rows Per Page</Text>
            <View style={styles.rowsPerPageBox}>
              <Text style={styles.rowsPerPageText}>10</Text>
            </View>
          </View>
          <Text style={styles.paginationText}>{`Showing ${showingStart}–${showingEnd} of ${total} Leads`}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  shell: {
    gap: 20,
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 220,
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableShell: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  tableHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.background,
    minWidth: 1440,
  },
  tableHeaderText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  paginationFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  paginationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowsPerPage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paginationText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  paginationPill: {
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  paginationPillActive: {
    backgroundColor: theme.colors.primary,
  },
  paginationPillText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  paginationPillTextActive: {
    color: '#fff',
  },
  rowsPerPageBox: {
    minWidth: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...theme.shadow.card,
  },
  rowsPerPageText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
});
