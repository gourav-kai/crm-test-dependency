import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthProvider } from './AuthProvider';
import { RequireAuth } from './RequireAuth';

function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login-search">{location.search}</div>;
}

function renderRoute(ui: ReactNode, initialEntries = ['/leads']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<LoginProbe />} path="/login" />
            <Route element={ui}>
              <Route element={<div>Leads</div>} path="/leads" />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('RequireAuth', () => {
  it('redirects anonymous users to login with the current path as next', async () => {
    renderRoute(<RequireAuth />);

    await waitFor(() =>
      expect(screen.getByTestId('login-search')).toHaveTextContent(
        '?next=%2Fleads',
      ),
    );
  });
});
