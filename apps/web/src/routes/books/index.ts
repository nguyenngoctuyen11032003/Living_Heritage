import { page, type AreaRoutes } from '../types';

// Area 'books' - workstream F2: memory book list, builder (with flip preview) and the A5 print view.
export const area: AreaRoutes = {
  app: [page('sach', () => import('./BooksPage')), page('sach/:id', () => import('./BookBuilderPage'))],
  bare: [page('sach/:id/in', () => import('./BookPrintPage'))],
};
