import { page, type AreaRoutes } from '../types';

// Workstream E1: family onboarding, members and invites.
export const membersArea: AreaRoutes = {
  site: [page('moi/:token', () => import('@/features/families/InviteAcceptPage'))],
  app: [
    page('gia-dinh/bat-dau', () => import('@/features/families/OnboardingPage')),
    page('gia-dinh/thanh-vien', () => import('@/features/families/MembersPage')),
  ],
};
