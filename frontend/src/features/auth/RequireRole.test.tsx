import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AUTH_TOKEN_KEY, AuthProvider } from './AuthProvider';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

function renderUsersRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/users']}>
          <Routes>
            <Route element={<div>Login</div>} path="/login" />
            <Route element={<RequireAuth />}>
              <Route
                element={
                  <RequireRole role="admin">
                    <div>Users Admin</div>
                  </RequireRole>
                }
                path="/users"
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('RequireRole', () => {
  it('renders a forbidden card when the user has the wrong role', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'sales-token');
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 2,
          email: 'rep@example.com',
          fullName: 'Sales Rep',
          role: 'sales',
          active: true,
        }),
      ),
    );

    renderUsersRoute();

    expect(
      await screen.findByRole('heading', { name: /403 - forbidden/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
