import type { AuthRole } from '../types/auth';

export type FrontendExperience =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_COORDINATOR'
  | 'SALES_EXECUTIVE'
  | 'TEAM_LEADER'
  | 'LEGACY_LEADER'
  | 'UNAVAILABLE';

const roleExperienceMap: Record<AuthRole, FrontendExperience> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  BUSINESS_HEAD: 'UNAVAILABLE',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_COORDINATOR: 'SALES_COORDINATOR',
  TEAM_LEADER: 'TEAM_LEADER',
  RELATIONSHIP_MANAGER: 'UNAVAILABLE',
  EMPLOYEE: 'SALES_EXECUTIVE',
  LEADER: 'LEGACY_LEADER',
};

export const getRoleExperience = (role: AuthRole | null | undefined): FrontendExperience =>
  role ? roleExperienceMap[role] : 'UNAVAILABLE';

export const isSalesWorkspaceExperience = (experience: FrontendExperience) =>
  experience === 'SALES_MANAGER' ||
  experience === 'SALES_EXECUTIVE';
