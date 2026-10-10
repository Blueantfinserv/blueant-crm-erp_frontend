import type { AuthRole } from '../types/auth';

export type FrontendExperience =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_COORDINATOR'
  | 'CRM_ONBOARDING'
  | 'SALES_EXECUTIVE'
  | 'TEAM_LEADER'
  | 'LEGACY_LEADER'
  | 'UNAVAILABLE';

const roleExperienceMap: Record<AuthRole, FrontendExperience> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  BUSINESS_HEAD: 'UNAVAILABLE',
  SALES_MANAGER: 'SALES_MANAGER',
  // Sales Coordinators use the shared individual sales workspace.
  SALES_COORDINATOR: 'SALES_MANAGER',
  // Process Coordinators retain the existing PC verification workspace.
  PC_COORDINATOR: 'SALES_COORDINATOR',
  CRM_ONBOARDING: 'CRM_ONBOARDING',
  TEAM_LEADER: 'TEAM_LEADER',
  // Relationship Managers use the same prospect workflow as Sales Managers.
  RELATIONSHIP_MANAGER: 'SALES_MANAGER',
  EMPLOYEE: 'SALES_EXECUTIVE',
  LEADER: 'LEGACY_LEADER',
};

export const getRoleExperience = (role: AuthRole | null | undefined): FrontendExperience =>
  role ? roleExperienceMap[role] : 'UNAVAILABLE';

export const isSalesWorkspaceExperience = (experience: FrontendExperience) =>
  experience === 'SALES_MANAGER' ||
  experience === 'SALES_EXECUTIVE';
