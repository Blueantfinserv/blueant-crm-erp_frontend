import { AuthRole } from '../../types/auth';

export type UsersRoleStatus = 'Active' | 'Inactive' | 'Invited';

export type UsersRoleRow = {
  employeeId: string;
  fullName: string;
  email: string;
  role: Exclude<AuthRole, 'TEAM_LEADER'> | 'TEAM_LEADER';
  department: string;
  reportingTo: string;
  branch: string;
  status: UsersRoleStatus;
  lastLogin: string;
};

export const usersRoleRows: UsersRoleRow[] = [
  { employeeId: 'EMP-1001', fullName: 'Aarav Sharma', email: 'aarav.sharma@blueant.com', role: 'SUPER_ADMIN', department: 'Operations', reportingTo: 'Board', branch: 'Corporate HQ', status: 'Active', lastLogin: 'Today, 08:42 AM' },
  { employeeId: 'EMP-1002', fullName: 'Meera Patel', email: 'meera.patel@blueant.com', role: 'ADMIN', department: 'Administration', reportingTo: 'Aarav Sharma', branch: 'Corporate HQ', status: 'Active', lastLogin: 'Today, 09:10 AM' },
  { employeeId: 'EMP-1003', fullName: 'Kabir Singh', email: 'kabir.singh@blueant.com', role: 'LEADER', department: 'Sales', reportingTo: 'Meera Patel', branch: 'Delhi North', status: 'Active', lastLogin: 'Yesterday, 06:21 PM' },
  { employeeId: 'EMP-1004', fullName: 'Ananya Verma', email: 'ananya.verma@blueant.com', role: 'TEAM_LEADER', department: 'Field Sales', reportingTo: 'Kabir Singh', branch: 'Delhi North', status: 'Inactive', lastLogin: '3 days ago' },
  { employeeId: 'EMP-1005', fullName: 'Rohan Mehta', email: 'rohan.mehta@blueant.com', role: 'LEADER', department: 'Sales', reportingTo: 'Meera Patel', branch: 'Mumbai West', status: 'Active', lastLogin: 'Today, 07:54 AM' },
  { employeeId: 'EMP-1006', fullName: 'Isha Gupta', email: 'isha.gupta@blueant.com', role: 'ADMIN', department: 'Support', reportingTo: 'Aarav Sharma', branch: 'Mumbai West', status: 'Inactive', lastLogin: '5 days ago' },
  { employeeId: 'EMP-1007', fullName: 'Nikhil Jain', email: 'nikhil.jain@blueant.com', role: 'SUPER_ADMIN', department: 'Governance', reportingTo: 'Board', branch: 'Corporate HQ', status: 'Active', lastLogin: 'Today, 08:05 AM' },
  { employeeId: 'EMP-1008', fullName: 'Pooja Nair', email: 'pooja.nair@blueant.com', role: 'TEAM_LEADER', department: 'Retail Sales', reportingTo: 'Rohan Mehta', branch: 'Bengaluru South', status: 'Active', lastLogin: 'Today, 10:14 AM' },
  { employeeId: 'EMP-1009', fullName: 'Siddharth Rao', email: 'siddharth.rao@blueant.com', role: 'ADMIN', department: 'Access Control', reportingTo: 'Aarav Sharma', branch: 'Corporate HQ', status: 'Active', lastLogin: 'Yesterday, 08:45 PM' },
  { employeeId: 'EMP-1010', fullName: 'Neha Singh', email: 'neha.singh@blueant.com', role: 'TEAM_LEADER', department: 'Enterprise Sales', reportingTo: 'Kabir Singh', branch: 'Pune Central', status: 'Inactive', lastLogin: '1 week ago' },
  { employeeId: 'EMP-1011', fullName: 'Tarun Bose', email: 'tarun.bose@blueant.com', role: 'LEADER', department: 'Sales', reportingTo: 'Meera Patel', branch: 'Pune Central', status: 'Active', lastLogin: 'Today, 09:36 AM' },
  { employeeId: 'EMP-1012', fullName: 'Kavya Menon', email: 'kavya.menon@blueant.com', role: 'ADMIN', department: 'HR Operations', reportingTo: 'Aarav Sharma', branch: 'Chennai East', status: 'Invited', lastLogin: 'Never' },
  { employeeId: 'EMP-1013', fullName: 'Arjun Malhotra', email: 'arjun.malhotra@blueant.com', role: 'TEAM_LEADER', department: 'SMB Sales', reportingTo: 'Rohan Mehta', branch: 'Chennai East', status: 'Active', lastLogin: 'Today, 11:02 AM' },
  { employeeId: 'EMP-1014', fullName: 'Sana Khan', email: 'sana.khan@blueant.com', role: 'LEADER', department: 'Sales', reportingTo: 'Meera Patel', branch: 'Delhi South', status: 'Invited', lastLogin: 'Never' },
  { employeeId: 'EMP-1015', fullName: 'Vikram Joshi', email: 'vikram.joshi@blueant.com', role: 'SUPER_ADMIN', department: 'Operations', reportingTo: 'Board', branch: 'Corporate HQ', status: 'Active', lastLogin: 'Today, 07:18 AM' },
];
