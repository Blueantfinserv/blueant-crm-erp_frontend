import { Text } from 'react-native';
import { TeamMappingBadge, TeamMappingCard } from './TeamMappingLayout';

export function LeaderMappingCard({
  name,
  totalTeamLeaders,
  totalSalesManagers,
  selected,
  onPress,
}: {
  name: string;
  totalTeamLeaders: number;
  totalSalesManagers: number;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TeamMappingCard title={name} selected={selected} onPress={onPress}>
      <Text>Team Leaders: {totalTeamLeaders}</Text>
      <Text>Sales Managers: {totalSalesManagers}</Text>
    </TeamMappingCard>
  );
}

export function TeamLeaderMappingCard({
  name,
  assignedSalesManagers,
  selected,
  onPress,
}: {
  name: string;
  assignedSalesManagers: number;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TeamMappingCard title={name} selected={selected} onPress={onPress}>
      <Text>Assigned Sales Managers: {assignedSalesManagers}</Text>
    </TeamMappingCard>
  );
}

export function SalesManagerMappingCard({
  name,
  status,
  selected,
  onPress,
}: {
  name: string;
  status: 'Active' | 'Inactive';
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TeamMappingCard title={name} selected={selected} onPress={onPress}>
      <TeamMappingBadge label={status} tone={status === 'Active' ? 'success' : 'warning'} />
    </TeamMappingCard>
  );
}

