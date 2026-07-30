import { ScrollView } from 'react-native';
import { LeadTable as LeadTableBody } from './LeadComponents';
import { LeadRow } from './leadData';

export function LeadTable({ rows, onLeadPress }: { rows: LeadRow[]; onLeadPress?: (lead: LeadRow) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <LeadTableBody rows={rows} onLeadPress={onLeadPress} />
    </ScrollView>
  );
}
