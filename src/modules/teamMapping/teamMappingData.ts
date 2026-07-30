export type TeamLeaderCardData = {
  name: string;
  assignedSalesManagers: number;
};

export type SalesManagerCardData = {
  name: string;
  status: 'Active' | 'Inactive';
};

export type LeaderCardData = {
  name: string;
  totalTeamLeaders: number;
  totalSalesManagers: number;
};

export const leaderCards: LeaderCardData[] = [
  { name: 'Aarav Sharma', totalTeamLeaders: 3, totalSalesManagers: 12 },
  { name: 'Meera Patel', totalTeamLeaders: 2, totalSalesManagers: 9 },
  { name: 'Kabir Singh', totalTeamLeaders: 4, totalSalesManagers: 14 },
];

export const teamLeaderCards: TeamLeaderCardData[] = [
  { name: 'Ananya Verma', assignedSalesManagers: 4 },
  { name: 'Rohan Mehta', assignedSalesManagers: 3 },
  { name: 'Pooja Nair', assignedSalesManagers: 5 },
  { name: 'Nikhil Jain', assignedSalesManagers: 2 },
];

export const salesManagerCards: SalesManagerCardData[] = [
  { name: 'Isha Gupta', status: 'Active' },
  { name: 'Siddharth Rao', status: 'Inactive' },
  { name: 'Ritika Kapoor', status: 'Active' },
  { name: 'Vivek Kumar', status: 'Active' },
  { name: 'Neha Singh', status: 'Inactive' },
  { name: 'Tarun Bose', status: 'Active' },
];

