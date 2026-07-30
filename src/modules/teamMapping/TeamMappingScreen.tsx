import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';
import {
  TeamMappingColumn,
  TeamMappingHeader,
  TeamMappingLayout,
} from './TeamMappingLayout';
import { leaderCards, salesManagerCards, teamLeaderCards } from './teamMappingData';
import {
  LeaderMappingCard,
  SalesManagerMappingCard,
  TeamLeaderMappingCard,
} from './TeamMappingCard';

type SelectionState = {
  leader: string | null;
  teamLeader: string | null;
  salesManager: string | null;
};

export function TeamMappingScreen() {
  const [selection, setSelection] = useState<SelectionState>({
    leader: null,
    teamLeader: null,
    salesManager: null,
  });

  const counts = useMemo(
    () => ({
      leaders: leaderCards.length,
      teamLeaders: teamLeaderCards.length,
      salesManagers: salesManagerCards.length,
    }),
    [],
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TeamMappingLayout>
        <TeamMappingHeader />
        <View style={styles.summaryRow} />
        <View style={styles.columns}>
          <TeamMappingColumn title={`Leaders (${counts.leaders})`}>
            {leaderCards.map((card) => (
              <LeaderMappingCard
                key={card.name}
                {...card}
                selected={selection.leader === card.name}
                onPress={() => setSelection((current) => ({ ...current, leader: card.name }))}
              />
            ))}
          </TeamMappingColumn>
          <TeamMappingColumn title={`Team Leaders (${counts.teamLeaders})`}>
            {teamLeaderCards.map((card) => (
              <TeamLeaderMappingCard
                key={card.name}
                {...card}
                selected={selection.teamLeader === card.name}
                onPress={() => setSelection((current) => ({ ...current, teamLeader: card.name }))}
              />
            ))}
          </TeamMappingColumn>
          <TeamMappingColumn title={`Sales Managers (${counts.salesManagers})`}>
            {salesManagerCards.map((card) => (
              <SalesManagerMappingCard
                key={card.name}
                {...card}
                selected={selection.salesManager === card.name}
                onPress={() => setSelection((current) => ({ ...current, salesManager: card.name }))}
              />
            ))}
          </TeamMappingColumn>
        </View>
      </TeamMappingLayout>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  summaryRow: {
    minHeight: 1,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});

