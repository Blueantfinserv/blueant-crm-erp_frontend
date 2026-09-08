import type { NavigationRoute } from '../navigation/navigationConfig';

export type ModuleKey = 'sales' | 'new-onboarding' | 'rm-crm' | 'helpdesk' | 'accounts' | 'hr';

export type TopTabKey = 'dashboard' | 'reports' | 'team-mapping' | 'users-roles' | 'all-tasks' | 'assigned-tasks' | 'more';

export type TopTabItem = {
  key: TopTabKey;
  label: string;
  route: NavigationRoute;
};

export type ModuleItem = {
  key: ModuleKey;
  label: string;
  icon: string;
  route: NavigationRoute;
};
