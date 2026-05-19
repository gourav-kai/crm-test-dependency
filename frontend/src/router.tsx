import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from './features/_home/HomePage';
import { AppShell } from './ui/AppShell';

/**
 * Router — application routes.
 *
 * Routes are mounted by their owning feature stories. Each feature folder owns
 * its page components; the router is the single auditable map (patterns §10).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <HomePage />
      </AppShell>
    ),
  },
]);
