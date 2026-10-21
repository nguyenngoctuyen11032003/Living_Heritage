import { page, type AreaRoutes } from '../types';

// Area 'media' (phase 3, workstream P2): family photo album and family tree.
export const area: AreaRoutes = {
  app: [
    page('gia-dinh/album', () => import('@/features/media/AlbumPage')),
    page('gia-dinh/cay-gia-dinh', () => import('@/features/media/FamilyTreePage')),
  ],
};
