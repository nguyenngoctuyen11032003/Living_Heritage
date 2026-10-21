import { page, type AreaRoutes } from '../types';

// Area 'legal' (Workstream C): bilingual static pages inside SiteLayout.
export const area: AreaRoutes = {
  site: [
    page('cach-hoat-dong', () => import('./HowItWorksPage')),
    page('goi-dich-vu', () => import('./PlansPage')),
    page('to-chuc', () => import('./OrganizationsPage')),
    page('quyen-rieng-tu', () => import('./PrivacyPage')),
    page('dieu-khoan', () => import('./TermsPage')),
    page('sach-ky-uc', () => import('./MemoryBookPage')),
    page('bat-dau', () => import('./StartPage')),
  ],
};
