import type { ModuleItem, TopTabItem } from '../layout/navigationTypes';
import { isSalesWorkspaceExperience, type FrontendExperience } from './roleExperience';

const baseTopTabs: TopTabItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: 'dashboard' },
  { key: 'reports', label: 'Reports', route: 'reports' },
  { key: 'team-mapping', label: 'Team Mapping', route: 'team-mapping' },
  { key: 'users-roles', label: 'Users & Roles', route: 'users-roles' },
  { key: 'all-tasks', label: 'All Tasks', route: 'leads' },
  { key: 'more', label: 'More', route: 'lead-details' },
];

const baseModuleItems: ModuleItem[] = [
  { key: 'sales', label: 'Sales', icon: 'SA', route: 'dashboard' },
  { key: 'new-onboarding', label: 'New Onboarding', icon: 'NO', route: 'coming-soon' },
  { key: 'rm-crm', label: 'RM & CRM', icon: 'RC', route: 'coming-soon' },
  { key: 'helpdesk', label: 'Helpdesk', icon: 'HD', route: 'coming-soon' },
  { key: 'accounts', label: 'Accounts', icon: 'AC', route: 'coming-soon' },
  { key: 'hr', label: 'HR', icon: 'HR', route: 'coming-soon' },
];

export const getTopTabsForExperience = (experience: FrontendExperience): TopTabItem[] => {
  if (experience === 'SALES_COORDINATOR' || experience === 'CRM_ONBOARDING') {
    return [{ key: 'dashboard', label: 'Dashboard', route: 'dashboard' }];
  }

  if (isSalesWorkspaceExperience(experience)) {
    return [
      { key: 'dashboard', label: 'Dashboard', route: 'dashboard' },
      { key: 'all-tasks', label: 'Your Task', route: 'leads' },
    ];
  }

  return baseTopTabs;
};

export const getModuleItemsForExperience = (experience: FrontendExperience): ModuleItem[] => {
  if (experience === 'SALES_COORDINATOR' || experience === 'CRM_ONBOARDING' || isSalesWorkspaceExperience(experience)) {
    return [];
  }

  return baseModuleItems;
};
