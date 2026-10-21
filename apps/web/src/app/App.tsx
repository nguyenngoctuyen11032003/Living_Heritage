import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/ui';
import { CurrentFamilyProvider } from '@/features/families/current';
import { LocaleProvider } from '@/i18n';
import { SessionProvider } from '@/lib/session';
import { createAppRouter } from './router';

export function App() {
  const [router] = useState(createAppRouter);
  return (
    <LocaleProvider>
      <SessionProvider>
        <CurrentFamilyProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </CurrentFamilyProvider>
      </SessionProvider>
    </LocaleProvider>
  );
}
