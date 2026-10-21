import { page, type AreaRoutes } from '../types';

// Area 'narrator' (Workstream E2): storytelling mode inside NarratorShell (large text, anonymous narrators allowed).
export const area: AreaRoutes = {
  narrator: [
    page('ke-chuyen', () => import('./StorytellingHome')),
    page('ke-chuyen/cua-toi', () => import('./MyStoriesPage')),
    page('ke-chuyen/chu-de/:slug', () => import('./TopicStartPage')),
    page('ke-chuyen/phien/:sessionId', () => import('./SessionPage')),
  ],
};
