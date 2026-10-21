import { page, type AreaRoutes } from '../types';

// Workstream E1: narrators and storytelling links.
export const narratorsArea: AreaRoutes = {
  app: [page('gia-dinh/nguoi-ke', () => import('@/features/narrators/NarratorsPage'))],
};
