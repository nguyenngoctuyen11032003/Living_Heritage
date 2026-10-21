import type { RouteObject } from 'react-router';

/**
 * Route contract: every area exports `area: AreaRoutes` from routes/<area>/index.ts.
 * - site:     public pages inside SiteLayout (header + footer)
 * - app:      signed-in family pages inside AppShell (RequireAuth, sidebar)
 * - narrator: storytelling pages inside NarratorShell (RequireAuth allowAnonymous, large text)
 * - bare:     full-screen pages with no layout (e.g. /k/:token, print views)
 * Paths are absolute without the leading slash, e.g. 'kham-pha', 'tri-thuc/:id'. Use `lazy` for page modules.
 */
export interface AreaRoutes {
  site?: RouteObject[];
  app?: RouteObject[];
  narrator?: RouteObject[];
  bare?: RouteObject[];
}

/** Helper: lazy page from a module whose default export is the page component. */
export function page(path: string, load: () => Promise<{ default: React.ComponentType }>): RouteObject {
  return { path, lazy: async () => ({ Component: (await load()).default }) };
}
