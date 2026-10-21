import { page, type AreaRoutes } from '../types';

// Workstream F2: family vault, private story detail, collections.
export const vaultArea: AreaRoutes = {
  app: [
    page('gia-dinh', () => import('./vault/VaultPage')),
    page('cau-chuyen/:id', () => import('./vault/StoryDetailPage')),
    page('gia-dinh/bo-suu-tap', () => import('./vault/CollectionsPage')),
    page('gia-dinh/bo-suu-tap/:id', () => import('./vault/CollectionPage')),
  ],
};
