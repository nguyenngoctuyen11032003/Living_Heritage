import { page, type AreaRoutes } from '../types';

// Area 'review' (workstream F1). /ban-nhap/:id is `bare`: it renders its own shell with RequireAuth allowAnonymous
// so both family users and the anonymous narrator user can open it (AppShell rejects anonymous users).
export const area: AreaRoutes = {
  bare: [page('ban-nhap/:id', () => import('@/features/review/ReviewPage'))],
};
