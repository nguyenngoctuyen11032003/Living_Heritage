import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { LocaleProvider } from '@/i18n';
import { SessionProvider } from '@/lib/session';
import { createAppRouter } from './router';

export function App() {
  const [router] = useState(createAppRouter);
  return (
    <LocaleProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </LocaleProvider>
  );
}
