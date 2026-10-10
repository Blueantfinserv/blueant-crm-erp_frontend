import { AuthRole } from '../types/auth';

export type NavigationRoute = 'dashboard' | 'reports' | 'users-roles' | 'team-mapping' | 'leads' | 'assigned-tasks' | 'lead-details' | 'add-followup' | 'coming-soon';

export type NavigationItem = {
  key: string;
  label: string;
  route: NavigationRoute;
  icon?: string;
};

export type RoleNavigationConfig = {
  role: AuthRole | null;
  title: string;
  subtitle: string;
  menuItems: NavigationItem[];
};

const commonItems: NavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: 'dashboard' },
];

const roleNavigationConfig: Partial<Record<AuthRole, RoleNavigationConfig>> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    title: 'Super Admin Dashboard',
    subtitle: 'Central governance, system oversight, and ERP configuration.',
    menuItems: [
      ...commonItems,
      { key: 'users-roles', label: 'Users & Roles', route: 'users-roles' },
      { key: 'team-mapping', label: 'Team Mapping', route: 'team-mapping' },
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  ADMIN: {
    role: 'ADMIN',
    title: 'Admin Dashboard',
    subtitle: 'User operations, access control, and platform administration.',
    menuItems: [
      ...commonItems,
      { key: 'users-roles', label: 'Users & Roles', route: 'users-roles' },
      { key: 'team-mapping', label: 'Team Mapping', route: 'team-mapping' },
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  LEADER: {
    role: 'LEADER',
    title: 'Leader Dashboard',
    subtitle: 'Team execution, pipeline visibility, and activity management.',
    menuItems: [
      ...commonItems,
      { key: 'team-mapping', label: 'Team Mapping', route: 'team-mapping' },
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  TEAM_LEADER: {
    role: 'TEAM_LEADER',
    title: 'Team Leader Dashboard',
    subtitle: 'Team-level execution, prospect supervision, and task coordination.',
    menuItems: [
      ...commonItems,
      { key: 'team-mapping', label: 'Team Mapping', route: 'team-mapping' },
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  SALES_MANAGER: {
    role: 'SALES_MANAGER',
    title: 'Sales Manager Dashboard',
    subtitle: 'Prospect flow, sales performance, and team productivity.',
    menuItems: [
      ...commonItems,
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  RELATIONSHIP_MANAGER: {
    role: 'RELATIONSHIP_MANAGER',
    title: 'Relationship Manager Dashboard',
    subtitle: 'Prospect flow, client relationships, and sales activity.',
    menuItems: [
      ...commonItems,
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  SALES_COORDINATOR: {
    role: 'SALES_COORDINATOR',
    title: 'Sales Coordinator Dashboard',
    subtitle: 'Prospect flow, meeting follow-ups, and sales activity.',
    menuItems: [
      ...commonItems,
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
  PC_COORDINATOR: {
    role: 'PC_COORDINATOR',
    title: 'PC Coordinator Dashboard',
    subtitle: 'PC Coordinator workspace.',
    menuItems: [...commonItems],
  },
  CRM_ONBOARDING: {
    role: 'CRM_ONBOARDING',
    title: 'CRM Onboarding Dashboard',
    subtitle: 'Review CRM-eligible leads and assign them to RM or SC.',
    menuItems: [
      ...commonItems,
      { key: 'leads', label: 'CRM Eligible Leads', route: 'leads' },
    ],
  },
  EMPLOYEE: {
    role: 'EMPLOYEE',
    title: 'Employee Dashboard',
    subtitle: 'Your assigned work and daily activity overview.',
    menuItems: [
      ...commonItems,
      { key: 'leads', label: 'Prospects', route: 'leads' },
    ],
  },
};

export const getRoleNavigationConfig = (role: AuthRole | string | null | undefined): RoleNavigationConfig => {
  const configuredRole = role ? roleNavigationConfig[role as AuthRole] : undefined;
  if (configuredRole) return configuredRole;
  return {
    role: null,
    title: 'Access unavailable',
    subtitle: 'Your account role is not configured for this application.',
    menuItems: [],
  };
};
