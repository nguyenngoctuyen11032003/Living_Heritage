import { Suspense, useState } from 'react';
import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/ui';
import { CurrentFamilyProvider } from '@/features/families/current';
import { LocaleProvider } from '@/i18n';
import { SessionProvider } from '@/lib/session';
import { useApplyTheme } from '@/lib/theme';
import { createAppRouter } from './router';

export function App() {
  const [router] = useState(createAppRouter);
  useApplyTheme();
  return (
    <LocaleProvider>
      {/* Dictionaries load per namespace (i18n/dictionaries.ts): the first render waits for the few it needs. Route
          changes are transitions, so they keep the current page on screen while a new namespace downloads. */}
      <Suspense fallback={null}>
        <SessionProvider>
          <CurrentFamilyProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </CurrentFamilyProvider>
        </SessionProvider>
      </Suspense>
    </LocaleProvider>
  );
}
