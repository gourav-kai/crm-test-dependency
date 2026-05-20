import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from './features/_home/HomePage';
import { LoginPage } from './features/auth/LoginPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { RequireRole } from './features/auth/RequireRole';
import { AppShell } from './ui/AppShell';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-gray-700">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

/**
 * Router — application routes.
 *
 * Routes are mounted by their owning feature stories. Each feature folder owns
 * its page components; the router is the single auditable map (patterns §10).
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        index: true,
        element: (
          <AppShell>
            <HomePage />
          </AppShell>
        ),
      },
      {
        path: 'leads',
        element: (
          <AppShell>
            <PlaceholderPage title="Leads" />
          </AppShell>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <AppShell>
            <PlaceholderPage title="Dashboard" />
          </AppShell>
        ),
      },
      {
        path: 'users',
        element: (
          <RequireRole role="admin">
            <AppShell>
              <PlaceholderPage title="Users" />
            </AppShell>
          </RequireRole>
        ),
      },
    ],
  },
]);
