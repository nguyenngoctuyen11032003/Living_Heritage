import { page, type AreaRoutes } from '../types';

// Area 'settings' (phase 3, workstream P1): account settings and the family privacy & data center.
export const area: AreaRoutes = {
  app: [
    page('cai-dat', () => import('@/features/settings/SettingsPage')),
    page('gia-dinh/du-lieu', () => import('@/features/settings/DataCenterPage')),
  ],
};
