import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './ui/AppShell';

/**
 * Router — application routes
 *
 * Currently:
 * - "/" → home (placeholder, will be replaced by story 1.4)
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome</h2>
          <p className="mt-2 text-gray-600">
            Application is loading...
          </p>
        </div>
      </AppShell>
    ),
  },
]);
